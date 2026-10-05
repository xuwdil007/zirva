package main

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"embed"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"

	"golang.org/x/crypto/bcrypt"
)

//go:embed content/default.json admin/*
var bundled embed.FS

type Field struct {
	Label string `json:"label"`
	Value string `json:"value"`
	Type  string `json:"type"`
	Group string `json:"group"`
}
type Lead struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Phone     string    `json:"phone"`
	Message   string    `json:"message"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
}
type TextRevision struct {
	Value      string    `json:"value"`
	Version    int       `json:"version"`
	ReplacedAt time.Time `json:"replacedAt"`
}
type Credentials struct {
	Username     string `json:"username"`
	PasswordHash []byte `json:"passwordHash"`
}
type State struct {
	Account *Credentials              `json:"account,omitempty"`
	History map[string][]TextRevision `json:"history,omitempty"`
	Version int                       `json:"version"`
	Content map[string]Field          `json:"content"`
	Leads   []Lead                    `json:"leads"`
}
type Session struct {
	CSRF    string
	Expires time.Time
}
type Counter struct {
	Count   int
	Expires time.Time
}
type App struct {
	mu            sync.Mutex
	state         State
	schema        map[string]Field
	sessions      map[[32]byte]Session
	limits        map[string]Counter
	dir, username string
	password      []byte
	origins       map[string]bool
	secure        bool
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
func token() string {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b)
}
func newApp(dir, user, password string, secure bool, origins string) (*App, error) {
	a := &App{dir: dir, username: user, secure: secure, sessions: make(map[[32]byte]Session), limits: make(map[string]Counter), origins: make(map[string]bool)}
	var err error
	for _, origin := range strings.Split(origins, ",") {
		if origin = strings.TrimSpace(origin); origin != "" {
			a.origins[origin] = true
		}
	}
	data, _ := bundled.ReadFile("content/default.json")
	if err = json.Unmarshal(data, &a.schema); err != nil {
		return nil, err
	}
	a.state = State{Version: 1, Content: map[string]Field{}, Leads: []Lead{}}
	for key, value := range a.schema {
		a.state.Content[key] = value
	}
	if err = os.MkdirAll(filepath.Join(dir, "uploads"), 0700); err != nil {
		return nil, err
	}
	data, err = os.ReadFile(filepath.Join(dir, "state.json"))
	if err == nil {
		if err = json.Unmarshal(data, &a.state); err != nil {
			return nil, fmt.Errorf("повреждён state.json: %w", err)
		}
	} else if !os.IsNotExist(err) {
		return nil, err
	}
	if a.state.Account != nil {
		if a.state.Account.Username == "" {
			return nil, errors.New("повреждены учётные данные администратора")
		}
		if _, err := bcrypt.Cost(a.state.Account.PasswordHash); err != nil {
			return nil, fmt.Errorf("повреждён хеш пароля: %w", err)
		}
		a.username = a.state.Account.Username
		a.password = append([]byte(nil), a.state.Account.PasswordHash...)
	} else {
		if len([]rune(password)) < 4 || len(password) > 72 {
			return nil, errors.New("ADMIN_PASSWORD: задайте пароль от 4 символов, не более 72 байт")
		}
		a.password, err = bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			return nil, err
		}
	}
	// Новые поля из обновлённого сайта появляются без потери ранее сохранённых текстов.
	for key, value := range a.schema {
		if _, ok := a.state.Content[key]; !ok {
			a.state.Content[key] = value
		}
	}
	// Обновляем название бренда и прежний слоган также в сохранённом контенте.
	// Остальные редакторские правки и загруженные изображения сохраняем.
	brandName := regexp.MustCompile(`(?i)\b(ZIRVA)\s+DEVELOPMENT\b`)
	brandChanged := false
	for key, field := range a.state.Content {
		if field.Type != "text" {
			continue
		}
		updated := field
		updated.Value = brandName.ReplaceAllString(field.Value, "$1")
		updated.Label = brandName.ReplaceAllString(field.Label, "$1")
		if key == "History.3" && strings.EqualFold(strings.TrimSpace(updated.Value), "Development") {
			updated.Value = ""
			updated.Label = a.schema[key].Label
		}
		if key == "Mission.6" {
			updated.Value = strings.ReplaceAll(updated.Value, "БА ҚУЛЛАҲОИ НАВ", "К НОВЫМ ВЕРШИНАМ")
			updated.Label = strings.ReplaceAll(updated.Label, "БА ҚУЛЛАҲОИ НАВ", "К НОВЫМ ВЕРШИНАМ")
		}
		if updated != field {
			a.state.Content[key] = updated
			brandChanged = true
		}
	}
	if brandChanged {
		a.state.Version++
		if err = a.save(a.state); err != nil {
			return nil, err
		}
	}
	return a, nil
}

// Запись через временный файл: не выдаём успех, пока данные не сохранены.
// Один экземпляр сервера владеет каталогом данных.
func (a *App) save(next State) error {
	data, err := json.MarshalIndent(next, "", "  ")
	if err != nil {
		return err
	}
	f, err := os.CreateTemp(a.dir, "state-*.tmp")
	if err != nil {
		return err
	}
	name := f.Name()
	defer os.Remove(name)
	if _, err = f.Write(data); err != nil {
		f.Close()
		return err
	}
	if err = f.Sync(); err != nil {
		f.Close()
		return err
	}
	if err = f.Close(); err != nil {
		return err
	}
	if err = os.Rename(name, filepath.Join(a.dir, "state.json")); err != nil {
		return err
	}
	a.state = next
	return nil
}
func reply(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(value)
}
func fail(w http.ResponseWriter, status int, message string) {
	reply(w, status, map[string]string{"error": message})
}
func decode(w http.ResponseWriter, r *http.Request, value any, max int64) bool {
	r.Body = http.MaxBytesReader(w, r.Body, max)
	d := json.NewDecoder(r.Body)
	d.DisallowUnknownFields()
	if err := d.Decode(value); err != nil {
		fail(w, 400, "Некорректные данные")
		return false
	}
	if err := d.Decode(new(any)); err != io.EOF {
		fail(w, 400, "Некорректные данные")
		return false
	}
	return true
}
func (a *App) limited(r *http.Request, kind string, max int) bool {
	ip, _, _ := net.SplitHostPort(r.RemoteAddr)
	// X-Forwarded-For намеренно не доверяем: клиент может подделать этот заголовок.
	key := kind + ip
	now := time.Now()
	a.mu.Lock()
	defer a.mu.Unlock()
	for k, v := range a.limits {
		if now.After(v.Expires) {
			delete(a.limits, k)
		}
	}
	c := a.limits[key]
	if c.Expires.IsZero() {
		c.Expires = now.Add(10 * time.Minute)
	}
	c.Count++
	a.limits[key] = c
	return c.Count > max
}
func (a *App) auth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("zirva_session")
		if err != nil {
			fail(w, 401, "Войдите в админку")
			return
		}
		key := sha256.Sum256([]byte(cookie.Value))
		a.mu.Lock()
		s, ok := a.sessions[key]
		if ok && time.Now().After(s.Expires) {
			delete(a.sessions, key)
			ok = false
		}
		a.mu.Unlock()
		if !ok {
			fail(w, 401, "Сессия истекла. Войдите снова")
			return
		}
		if r.Method != "GET" && subtle.ConstantTimeCompare([]byte(r.Header.Get("X-CSRF-Token")), []byte(s.CSRF)) != 1 {
			fail(w, 403, "Обновите страницу и повторите действие")
			return
		}
		next(w, r)
	}
}
func (a *App) handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) { reply(w, 200, map[string]bool{"ok": true}) })
	mux.HandleFunc("GET /api/content", func(w http.ResponseWriter, r *http.Request) {
		a.mu.Lock()
		defer a.mu.Unlock()
		reply(w, 200, map[string]any{"version": a.state.Version, "content": a.state.Content})
	})
	mux.HandleFunc("POST /api/leads", a.createLead)
	mux.HandleFunc("POST /api/admin/login", a.login)
	mux.HandleFunc("GET /api/admin/session", a.auth(func(w http.ResponseWriter, r *http.Request) {
		c, _ := r.Cookie("zirva_session")
		a.mu.Lock()
		s := a.sessions[sha256.Sum256([]byte(c.Value))]
		username := a.username
		a.mu.Unlock()
		reply(w, 200, map[string]string{"csrf": s.CSRF, "username": username})
	}))
	mux.HandleFunc("POST /api/admin/logout", a.auth(func(w http.ResponseWriter, r *http.Request) {
		c, _ := r.Cookie("zirva_session")
		a.mu.Lock()
		delete(a.sessions, sha256.Sum256([]byte(c.Value)))
		a.mu.Unlock()
		http.SetCookie(w, &http.Cookie{Name: "zirva_session", Value: "", Path: "/api/admin", MaxAge: -1, HttpOnly: true, Secure: a.secure, SameSite: http.SameSiteStrictMode})
		reply(w, 200, map[string]bool{"ok": true})
	}))
	mux.HandleFunc("PUT /api/admin/account", a.auth(a.updateAccount))
	mux.HandleFunc("PUT /api/admin/content", a.auth(a.updateContent))
	mux.HandleFunc("GET /api/admin/history", a.auth(func(w http.ResponseWriter, r *http.Request) {
		a.mu.Lock()
		defer a.mu.Unlock()
		defaults := make(map[string]string)
		for key, field := range a.schema {
			if field.Type == "text" {
				defaults[key] = field.Value
			}
		}
		reply(w, 200, map[string]any{"history": a.state.History, "defaults": defaults})
	}))
	mux.HandleFunc("POST /api/admin/media", a.auth(a.upload))
	mux.HandleFunc("GET /api/admin/leads", a.auth(func(w http.ResponseWriter, r *http.Request) {
		a.mu.Lock()
		defer a.mu.Unlock()
		reply(w, 200, a.state.Leads)
	}))
	mux.HandleFunc("PATCH /api/admin/leads/{id}", a.auth(a.updateLead))
	mux.HandleFunc("GET /media/{name}", func(w http.ResponseWriter, r *http.Request) {
		name := r.PathValue("name")
		if !regexp.MustCompile(`^[a-f0-9]{64}\.(png|jpg)$`).MatchString(name) {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		http.ServeFile(w, r, filepath.Join(a.dir, "uploads", name))
	})
	// При наличии сборки её /assets содержит также JavaScript, CSS и шрифты.
	// public/assets нужен только для предпросмотра изображений без сборки.
	if assets := os.Getenv("ASSETS_DIR"); assets != "" && os.Getenv("SITE_DIR") == "" {
		mux.Handle("GET /assets/", http.StripPrefix("/assets/", http.FileServer(http.Dir(assets))))
	}
	admin, _ := fs.Sub(bundled, "admin")
	mux.Handle("GET /admin/", http.StripPrefix("/admin/", http.FileServer(http.FS(admin))))
	if site := os.Getenv("SITE_DIR"); site != "" {
		mux.Handle("GET /", http.FileServer(http.Dir(site)))
	} else {
		mux.HandleFunc("GET /{$}", func(w http.ResponseWriter, r *http.Request) { http.Redirect(w, r, "/admin/", 302) })
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "same-origin")
		w.Header().Set("X-Frame-Options", "DENY")
		if strings.HasPrefix(r.URL.Path, "/api/") {
			w.Header().Set("Cache-Control", "no-store")
		}
		if strings.HasPrefix(r.URL.Path, "/admin/") {
			w.Header().Set("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
		}
		origin := r.Header.Get("Origin")
		if origin != "" {
			scheme := "http"
			if a.secure || r.TLS != nil {
				scheme = "https"
			}
			same := origin == scheme+"://"+r.Host
			public := r.URL.Path == "/api/content" || r.URL.Path == "/api/leads"
			if !same && !(public && a.origins[origin]) {
				fail(w, 403, "Источник запроса не разрешён")
				return
			}
			if public && a.origins[origin] {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Add("Vary", "Origin")
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
			}
		}
		if r.Method == "OPTIONS" {
			w.WriteHeader(204)
			return
		}
		mux.ServeHTTP(w, r)
	})
}
func (a *App) login(w http.ResponseWriter, r *http.Request) {
	if a.limited(r, "login", 10) {
		fail(w, 429, "Слишком много попыток. Повторите через 10 минут")
		return
	}
	var input struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if !decode(w, r, &input, 4096) {
		return
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	err := bcrypt.CompareHashAndPassword(a.password, []byte(input.Password))
	if err != nil || subtle.ConstantTimeCompare([]byte(input.Username), []byte(a.username)) != 1 {
		fail(w, 401, "Неверный логин или пароль")
		return
	}
	value, csrf := token(), token()
	expires := time.Now().Add(12 * time.Hour)
	for key, s := range a.sessions {
		if time.Now().After(s.Expires) {
			delete(a.sessions, key)
		}
	}
	a.sessions[sha256.Sum256([]byte(value))] = Session{csrf, expires}
	http.SetCookie(w, &http.Cookie{Name: "zirva_session", Value: value, Path: "/api/admin", HttpOnly: true, Secure: a.secure, SameSite: http.SameSiteStrictMode, Expires: expires, MaxAge: 43200})
	reply(w, 200, map[string]string{"csrf": csrf, "username": a.username})
}
func (a *App) updateAccount(w http.ResponseWriter, r *http.Request) {
	if a.limited(r, "account", 10) {
		fail(w, 429, "Слишком много попыток. Повторите через 10 минут")
		return
	}
	var input struct {
		Username        string `json:"username"`
		CurrentPassword string `json:"currentPassword"`
		Password        string `json:"password"`
	}
	if !decode(w, r, &input, 4096) {
		return
	}
	input.Username = strings.TrimSpace(input.Username)
	if !regexp.MustCompile(`^[a-zA-Z0-9_.@-]{3,64}$`).MatchString(input.Username) {
		fail(w, 422, "Логин: от 3 до 64 символов, латинские буквы, цифры, точка, дефис, @ или _")
		return
	}
	if len([]rune(input.Password)) < 4 || len(input.Password) > 72 {
		fail(w, 422, "Новый пароль должен содержать минимум 4 символа и занимать не более 72 байт")
		return
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	// Повторная проверка под блокировкой: параллельная смена могла завершить сессию.
	cookie, _ := r.Cookie("zirva_session")
	session, ok := a.sessions[sha256.Sum256([]byte(cookie.Value))]
	if !ok || time.Now().After(session.Expires) {
		fail(w, 401, "Войдите в админку")
		return
	}
	if bcrypt.CompareHashAndPassword(a.password, []byte(input.CurrentPassword)) != nil {
		fail(w, 403, "Текущий пароль указан неверно")
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		fail(w, 500, "Не удалось изменить пароль")
		return
	}
	next := a.state
	next.Account = &Credentials{Username: input.Username, PasswordHash: hash}
	if err := a.save(next); err != nil {
		fail(w, 500, "Не удалось сохранить учётные данные")
		return
	}
	a.username, a.password = input.Username, hash
	a.sessions = make(map[[32]byte]Session)
	http.SetCookie(w, &http.Cookie{Name: "zirva_session", Value: "", Path: "/api/admin", MaxAge: -1, HttpOnly: true, Secure: a.secure, SameSite: http.SameSiteStrictMode})
	reply(w, 200, map[string]bool{"ok": true})
}

func (a *App) createLead(w http.ResponseWriter, r *http.Request) {
	if a.limited(r, "lead", 10) {
		fail(w, 429, "Слишком много заявок. Повторите через 10 минут")
		return
	}
	var input struct {
		Name    string `json:"name"`
		Phone   string `json:"phone"`
		Message string `json:"message"`
		Website string `json:"website"`
	}
	if !decode(w, r, &input, 20000) {
		return
	}
	input.Name = strings.TrimSpace(input.Name)
	input.Phone = strings.TrimSpace(input.Phone)
	input.Message = strings.TrimSpace(input.Message)
	digits := regexp.MustCompile(`\D`).ReplaceAllString(input.Phone, "")
	if input.Website != "" || len([]rune(input.Name)) < 2 || len([]rune(input.Name)) > 100 || len(digits) < 7 || len(digits) > 15 || len(input.Phone) > 40 || len([]rune(input.Message)) > 3000 {
		fail(w, 422, "Проверьте имя и номер телефона (7–15 цифр)")
		return
	}
	lead := Lead{ID: token(), Name: input.Name, Phone: input.Phone, Message: input.Message, Status: "new", CreatedAt: time.Now().UTC()}
	a.mu.Lock()
	defer a.mu.Unlock()
	next := a.state
	next.Leads = append(append([]Lead{}, a.state.Leads...), lead)
	if err := a.save(next); err != nil {
		log.Printf("save lead: %v", err)
		fail(w, 500, "Не удалось сохранить заявку. Повторите позже")
		return
	}
	reply(w, 201, map[string]string{"id": lead.ID})
}
func (a *App) updateLead(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Status string `json:"status"`
	}
	if !decode(w, r, &input, 1024) {
		return
	}
	if input.Status != "new" && input.Status != "progress" && input.Status != "done" {
		fail(w, 422, "Неизвестный статус")
		return
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	next := a.state
	next.Leads = append([]Lead{}, a.state.Leads...)
	for i := range next.Leads {
		if next.Leads[i].ID == r.PathValue("id") {
			next.Leads[i].Status = input.Status
			if err := a.save(next); err != nil {
				fail(w, 500, "Не удалось сохранить статус")
				return
			}
			reply(w, 200, next.Leads[i])
			return
		}
	}
	fail(w, 404, "Заявка не найдена")
}
func (a *App) updateContent(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Version int              `json:"version"`
		Content map[string]Field `json:"content"`
	}
	if !decode(w, r, &input, 2<<20) {
		return
	}
	if len(input.Content) != len(a.schema) {
		fail(w, 422, "Неполный набор полей. Обновите страницу")
		return
	}
	nextContent := make(map[string]Field)
	for key, field := range a.schema {
		incoming, ok := input.Content[key]
		if !ok || len([]rune(incoming.Value)) > 10000 {
			fail(w, 422, "Некорректное поле: "+key)
			return
		}
		if field.Type == "image" && incoming.Value != field.Value {
			if !regexp.MustCompile(`^/media/[a-f0-9]{64}\.(png|jpg)$`).MatchString(incoming.Value) {
				fail(w, 422, "Выберите загруженное изображение")
				return
			}
			if _, err := os.Stat(filepath.Join(a.dir, "uploads", filepath.Base(incoming.Value))); err != nil {
				fail(w, 422, "Изображение не найдено")
				return
			}
		}
		field.Value = incoming.Value
		nextContent[key] = field
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	if input.Version != a.state.Version {
		fail(w, 409, "Контент уже изменён в другой вкладке. Скопируйте свои правки и перезагрузите страницу")
		return
	}
	next := a.state
	next.Content = nextContent
	// Сохраняем предыдущий текст только изменённых полей. Копия истории
	// не затрагивает текущее состояние при ошибке записи на диск.
	next.History = make(map[string][]TextRevision)
	for key, revisions := range a.state.History {
		next.History[key] = append([]TextRevision(nil), revisions...)
	}
	for key, field := range nextContent {
		old := a.state.Content[key]
		if field.Type != "text" || field.Value == old.Value {
			continue
		}
		revisions := append(next.History[key], TextRevision{Value: old.Value, Version: a.state.Version, ReplacedAt: time.Now().UTC()})
		if len(revisions) > 30 {
			revisions = revisions[len(revisions)-30:]
		}
		next.History[key] = revisions
	}
	next.Version++
	if err := a.save(next); err != nil {
		fail(w, 500, "Не удалось сохранить изменения")
		return
	}
	reply(w, 200, map[string]int{"version": next.Version})
}
func (a *App) upload(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 9<<20)
	if err := r.ParseMultipartForm(9 << 20); err != nil {
		fail(w, 400, "Максимальный размер файла — 8 МБ")
		return
	}
	defer r.MultipartForm.RemoveAll()
	file, _, err := r.FormFile("file")
	if err != nil {
		fail(w, 400, "Выберите файл")
		return
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(file, (8<<20)+1))
	if err != nil || len(data) > 8<<20 {
		fail(w, 400, "Максимальный размер файла — 8 МБ")
		return
	}
	config, format, err := image.DecodeConfig(strings.NewReader(string(data)))
	if err != nil || (format != "png" && format != "jpeg") || config.Width < 1 || config.Height < 1 || int64(config.Width)*int64(config.Height) > 40000000 {
		fail(w, 422, "Нужен PNG или JPEG, не более 40 мегапикселей")
		return
	}
	ext := "jpg"
	if format == "png" {
		ext = "png"
	}
	name := token() + "." + ext
	if err = os.WriteFile(filepath.Join(a.dir, "uploads", name), data, 0600); err != nil {
		fail(w, 500, "Не удалось загрузить изображение")
		return
	}
	reply(w, 201, map[string]string{"url": "/media/" + name})
}
func main() {
	a, err := newApp(env("DATA_DIR", "./data"), env("ADMIN_USERNAME", "admin"), os.Getenv("ADMIN_PASSWORD"), os.Getenv("COOKIE_SECURE") == "true", env("PUBLIC_ORIGINS", "http://localhost:5173,http://localhost:4173"))
	if err != nil {
		log.Fatal(err)
	}
	server := &http.Server{Addr: env("ADDR", ":8080"), Handler: a.handler(), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 30 * time.Second, WriteTimeout: 30 * time.Second, IdleTimeout: 60 * time.Second, MaxHeaderBytes: 1 << 20}
	address := server.Addr
	if strings.HasPrefix(address, ":") {
		address = "localhost" + address
	}
	log.Printf("Zirva: http://%s/admin/", address)
	log.Fatal(server.ListenAndServe())
}
