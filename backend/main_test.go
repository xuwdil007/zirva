package main

import (
	"bytes"
	"encoding/json"
	"image"
	"image/png"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
)

func testApp(t *testing.T) *App {
	t.Helper()
	a, err := newApp(t.TempDir(), "admin", "test-password-only-123", false, "https://xuwdil007.github.io")
	if err != nil {
		t.Fatal(err)
	}
	return a
}
func request(a *App, method, path string, body any, cookie *http.Cookie, csrf string) *httptest.ResponseRecorder {
	data, _ := json.Marshal(body)
	r := httptest.NewRequest(method, path, bytes.NewReader(data))
	r.RemoteAddr = "127.0.0.1:1234"
	if cookie != nil {
		r.AddCookie(cookie)
	}
	if csrf != "" {
		r.Header.Set("X-CSRF-Token", csrf)
	}
	w := httptest.NewRecorder()
	a.handler().ServeHTTP(w, r)
	return w
}
func loginTest(t *testing.T, a *App) (*http.Cookie, string) {
	t.Helper()
	w := request(a, "POST", "/api/admin/login", map[string]string{"username": "admin", "password": "test-password-only-123"}, nil, "")
	if w.Code != 200 {
		t.Fatal(w.Body.String())
	}
	var result map[string]string
	json.Unmarshal(w.Body.Bytes(), &result)
	return w.Result().Cookies()[0], result["csrf"]
}
func TestAuthContentPersistence(t *testing.T) {
	a := testApp(t)
	if w := request(a, "GET", "/api/admin/leads", nil, nil, ""); w.Code != 401 {
		t.Fatal(w.Code)
	}
	if w := request(a, "POST", "/api/admin/login", map[string]string{"username": "admin", "password": "wrong"}, nil, ""); w.Code != 401 {
		t.Fatal(w.Code)
	}
	cookie, csrf := loginTest(t, a)
	if !cookie.HttpOnly || cookie.SameSite != http.SameSiteStrictMode {
		t.Fatal("unsafe cookie")
	}
	content := make(map[string]Field)
	for k, v := range a.state.Content {
		content[k] = v
	}
	f := content["seo.title"]
	f.Value = "Обновлённая Zirva"
	content["seo.title"] = f
	input := map[string]any{"version": 1, "content": content}
	if w := request(a, "PUT", "/api/admin/content", input, cookie, ""); w.Code != 403 {
		t.Fatal(w.Code)
	}
	if w := request(a, "PUT", "/api/admin/content", input, cookie, csrf); w.Code != 200 {
		t.Fatal(w.Body.String())
	}
	if w := request(a, "PUT", "/api/admin/content", input, cookie, csrf); w.Code != 409 {
		t.Fatal("conflict", w.Code)
	}
	restored, err := newApp(a.dir, "admin", "test-password-only-123", false, "")
	if err != nil {
		t.Fatal(err)
	}
	if restored.state.Content["seo.title"].Value != f.Value {
		t.Fatal("content lost on restart")
	}
	request(a, "POST", "/api/admin/logout", nil, cookie, csrf)
	if w := request(a, "GET", "/api/admin/leads", nil, cookie, ""); w.Code != 401 {
		t.Fatal("logout failed")
	}
}
func TestLeadsConcurrentAndPersistent(t *testing.T) {
	a := testApp(t)
	var wg sync.WaitGroup
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			w := request(a, "POST", "/api/leads", map[string]string{"name": "Тестовый клиент", "phone": "+992 98 836 55 04", "message": "Новый объект"}, nil, "")
			if w.Code != 201 {
				t.Errorf("lead: %d %s", w.Code, w.Body.String())
			}
		}()
	}
	wg.Wait()
	if len(a.state.Leads) != 8 {
		t.Fatal("lost concurrent leads")
	}
	cookie, csrf := loginTest(t, a)
	id := a.state.Leads[0].ID
	if w := request(a, "PATCH", "/api/admin/leads/"+id, map[string]string{"status": "progress"}, cookie, csrf); w.Code != 200 {
		t.Fatal(w.Body.String())
	}
	restored, err := newApp(a.dir, "admin", "test-password-only-123", false, "")
	if err != nil {
		t.Fatal(err)
	}
	if len(restored.state.Leads) != 8 || restored.state.Leads[0].Status != "progress" {
		t.Fatal("leads lost on restart")
	}
	if w := request(a, "POST", "/api/leads", map[string]string{"name": "Иван", "phone": "123"}, nil, ""); w.Code != 422 {
		t.Fatal("invalid phone accepted")
	}
}
func TestCORSAndUploads(t *testing.T) {
	a := testApp(t)
	for _, entry := range []struct {
		path, origin string
		status       int
	}{{"/api/content", "https://xuwdil007.github.io", 200}, {"/api/content", "https://evil.example", 403}, {"/api/admin/session", "https://xuwdil007.github.io", 403}} {
		r := httptest.NewRequest("GET", entry.path, nil)
		r.Header.Set("Origin", entry.origin)
		w := httptest.NewRecorder()
		a.handler().ServeHTTP(w, r)
		if w.Code != entry.status {
			t.Fatal(entry, w.Code)
		}
	}
	cookie, csrf := loginTest(t, a)
	upload := func(data []byte) *httptest.ResponseRecorder {
		var body bytes.Buffer
		writer := multipart.NewWriter(&body)
		file, _ := writer.CreateFormFile("file", "photo.png")
		file.Write(data)
		writer.Close()
		r := httptest.NewRequest("POST", "/api/admin/media", &body)
		r.Header.Set("Content-Type", writer.FormDataContentType())
		r.Header.Set("X-CSRF-Token", csrf)
		r.AddCookie(cookie)
		w := httptest.NewRecorder()
		a.handler().ServeHTTP(w, r)
		return w
	}
	if w := upload([]byte(`<svg onload="alert(1)"></svg>`)); w.Code != 422 {
		t.Fatal("SVG accepted")
	}
	var pngData bytes.Buffer
	png.Encode(&pngData, image.NewRGBA(image.Rect(0, 0, 4, 4)))
	w := upload(pngData.Bytes())
	if w.Code != 201 {
		t.Fatal(w.Body.String())
	}
	var result map[string]string
	json.Unmarshal(w.Body.Bytes(), &result)
	if !strings.HasPrefix(result["url"], "/media/") {
		t.Fatal(result)
	}
	if w := request(a, "GET", result["url"], nil, nil, ""); w.Code != 200 {
		t.Fatal("uploaded media unavailable")
	}
}

func TestTextHistory(t *testing.T) {
	a := testApp(t)
	if w := request(a, "GET", "/api/admin/history", nil, nil, ""); w.Code != 401 {
		t.Fatal("history must require login")
	}
	cookie, csrf := loginTest(t, a)
	original := a.state.Content["seo.title"].Value
	for i := 0; i < 32; i++ {
		content := make(map[string]Field)
		for key, field := range a.state.Content {
			content[key] = field
		}
		field := content["seo.title"]
		field.Value = strings.Repeat("Я", i+1)
		content["seo.title"] = field
		w := request(a, "PUT", "/api/admin/content", map[string]any{"version": a.state.Version, "content": content}, cookie, csrf)
		if w.Code != 200 {
			t.Fatal(w.Body.String())
		}
	}
	if len(a.state.History["seo.title"]) != 30 {
		t.Fatal("history limit")
	}
	if len(a.state.History["About.6"]) != 0 {
		t.Fatal("unchanged field archived")
	}
	before := a.state.History["seo.title"][29]
	if before.Value != strings.Repeat("Я", 31) || before.ReplacedAt.IsZero() {
		t.Fatal("previous text missing")
	}
	// Восстановление — обычное сохранение поля; отменяемый вариант тоже остаётся в истории.
	content := make(map[string]Field)
	for key, field := range a.state.Content {
		content[key] = field
	}
	field := content["seo.title"]
	field.Value = before.Value
	content["seo.title"] = field
	if w := request(a, "PUT", "/api/admin/content", map[string]any{"version": a.state.Version, "content": content}, cookie, csrf); w.Code != 200 {
		t.Fatal(w.Body.String())
	}
	restored, err := newApp(a.dir, "admin", "test-password-only-123", false, "")
	if err != nil {
		t.Fatal(err)
	}
	if restored.state.History["seo.title"][29].Value != strings.Repeat("Я", 32) {
		t.Fatal("history not persisted")
	}
	if restored.state.Content["seo.title"].Value != before.Value {
		t.Fatal("restored text not persisted")
	}
	w := request(a, "GET", "/api/admin/history", nil, cookie, "")
	var payload struct {
		Defaults map[string]string `json:"defaults"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	if payload.Defaults["seo.title"] != original {
		t.Fatal("original text missing")
	}
}

func TestBrandRefreshPreservesSavedContent(t *testing.T) {
	a := testApp(t)
	field := a.state.Content["About.1"]
	field.Value = "ZIRVA Development — наш обновлённый текст"
	field.Label = "ZIRVA DEVELOPMENT"
	a.state.Content["About.1"] = field
	slogan := a.state.Content["Mission.6"]
	slogan.Value = "БА ҚУЛЛАҲОИ НАВ"
	a.state.Content["Mission.6"] = slogan
	photo := a.state.Content["images.logo"]
	photo.Value = "/media/custom-logo.png"
	a.state.Content["images.logo"] = photo
	if err := a.save(a.state); err != nil {
		t.Fatal(err)
	}
	before := a.state.Version
	reopened, err := newApp(a.dir, "admin", "test-password-only-123", false, "")
	if err != nil {
		t.Fatal(err)
	}
	if got := reopened.state.Content["About.1"]; got.Value != "ZIRVA — наш обновлённый текст" || got.Label != "ZIRVA" {
		t.Fatal(got)
	}
	if got := reopened.state.Content["Mission.6"].Value; got != "К НОВЫМ ВЕРШИНАМ" {
		t.Fatal(got)
	}
	if reopened.state.Content["images.logo"] != photo {
		t.Fatal("custom image changed")
	}
	if reopened.state.Version != before+1 {
		t.Fatal("version not updated")
	}
	again, err := newApp(a.dir, "admin", "test-password-only-123", false, "")
	if err != nil {
		t.Fatal(err)
	}
	if again.state.Version != reopened.state.Version {
		t.Fatal("migration repeated")
	}
}

func TestAccountChange(t *testing.T) {
	a := testApp(t)
	cookie, csrf := loginTest(t, a)
	otherCookie, _ := loginTest(t, a)
	input := map[string]string{"username": "new-admin", "currentPassword": "test-password-only-123", "password": "abcd"}
	if w := request(a, "PUT", "/api/admin/account", input, nil, ""); w.Code != 401 {
		t.Fatal(w.Code)
	}
	if w := request(a, "PUT", "/api/admin/account", input, cookie, ""); w.Code != 403 {
		t.Fatal(w.Code)
	}
	input["currentPassword"] = "incorrect"
	if w := request(a, "PUT", "/api/admin/account", input, cookie, csrf); w.Code != 403 {
		t.Fatal(w.Code)
	}
	input["currentPassword"] = "test-password-only-123"
	for _, password := range []string{"abc", "яяя", strings.Repeat("я", 37)} {
		input["password"] = password
		if w := request(a, "PUT", "/api/admin/account", input, cookie, csrf); w.Code != 422 {
			t.Fatal(w.Code)
		}
	}
	input["password"] = "abcd"
	input["username"] = "bad login"
	if w := request(a, "PUT", "/api/admin/account", input, cookie, csrf); w.Code != 422 {
		t.Fatal(w.Code)
	}
	input["username"] = "new-admin"
	// Ошибка записи не должна менять действующий пароль или завершать сессию.
	dir := a.dir
	a.dir = dir + "/missing-directory"
	if w := request(a, "PUT", "/api/admin/account", input, cookie, csrf); w.Code != 500 {
		t.Fatal(w.Code)
	}
	a.dir = dir
	if a.username != "admin" || a.state.Account != nil {
		t.Fatal("credentials changed after failed write")
	}
	if w := request(a, "GET", "/api/admin/session", nil, cookie, ""); w.Code != 200 {
		t.Fatal(w.Code)
	}
	if w := request(a, "PUT", "/api/admin/account", input, cookie, csrf); w.Code != 200 {
		t.Fatal(w.Code, w.Body.String())
	}
	for _, oldCookie := range []*http.Cookie{cookie, otherCookie} {
		if w := request(a, "GET", "/api/admin/session", nil, oldCookie, ""); w.Code != 401 {
			t.Fatal("old session accepted")
		}
	}
	if w := request(a, "POST", "/api/admin/login", map[string]string{"username": "admin", "password": "test-password-only-123"}, nil, ""); w.Code != 401 {
		t.Fatal("old login accepted")
	}
	if w := request(a, "POST", "/api/admin/login", map[string]string{"username": "new-admin", "password": "abcd"}, nil, ""); w.Code != 200 {
		t.Fatal(w.Code)
	}
	public := request(a, "GET", "/api/content", nil, nil, "").Body.String()
	if strings.Contains(public, "passwordHash") || strings.Contains(public, "new-admin") {
		t.Fatal("account leaked in public API")
	}
	stored, err := os.ReadFile(filepath.Join(dir, "state.json"))
	if err != nil {
		t.Fatal(err)
	}
	if bytes.Contains(stored, []byte(input["password"])) || bytes.Contains(stored, []byte(input["currentPassword"])) {
		t.Fatal("plaintext password on disk")
	}
	reopened, err := newApp(dir, "admin", "", false, "")
	if err != nil {
		t.Fatal(err)
	}
	if w := request(reopened, "POST", "/api/admin/login", map[string]string{"username": "new-admin", "password": "abcd"}, nil, ""); w.Code != 200 {
		t.Fatal("new login lost after restart", w.Code)
	}
	if w := request(reopened, "POST", "/api/admin/login", map[string]string{"username": "admin", "password": "test-password-only-123"}, nil, ""); w.Code != 401 {
		t.Fatal("old login restored on restart")
	}
}

func TestLeadLifecyclePersistence(t *testing.T) {
	a := testApp(t)
	cookie, csrf := loginTest(t, a)
	created := request(a, "POST", "/api/leads", map[string]string{"name": "Клиент", "phone": "123456789"}, nil, "")
	if created.Code != 201 {
		t.Fatal(created.Code)
	}
	original := a.state.Leads[0]
	endpoint := "/api/admin/leads/" + original.ID
	if w := request(a, "PATCH", endpoint, map[string]string{"lifecycle": "deleted"}, nil, ""); w.Code != 401 {
		t.Fatal(w.Code)
	}
	if w := request(a, "PATCH", endpoint, map[string]string{"lifecycle": "unknown"}, cookie, csrf); w.Code != 422 {
		t.Fatal(w.Code)
	}
	for _, lifecycle := range []string{"draft", "deleted", "active"} {
		if w := request(a, "PATCH", endpoint, map[string]string{"lifecycle": lifecycle}, cookie, csrf); w.Code != 200 {
			t.Fatal(w.Code, w.Body.String())
		}
		restored, err := newApp(a.dir, "admin", "test-password-only-123", false, "")
		if err != nil {
			t.Fatal(err)
		}
		got := restored.state.Leads[0]
		if got.Lifecycle != lifecycle || got.Status != original.Status || !got.CreatedAt.Equal(original.CreatedAt) || got.ID != original.ID {
			t.Fatal(got)
		}
	}
}
