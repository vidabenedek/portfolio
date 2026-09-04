# frozen_string_literal: true

OUTPUT_PATH = "CHATGPT-PROJEKT.md"
PROJECT_FILES = [
  "index.html",
  "showreel/index.html",
  "styles.css",
  "script.js",
  "favicon.svg",
  "robots.txt",
  "sitemap.xml",
  "CNAME",
  "README.md"
].freeze

LANGUAGE_BY_EXTENSION = {
  ".html" => "html",
  ".css" => "css",
  ".js" => "javascript",
  ".svg" => "xml",
  ".xml" => "xml",
  ".md" => "markdown",
  ".txt" => "text"
}.freeze

header = <<~'MARKDOWN'
  # Vida Benedek portfolio – ChatGPT fejlesztői csomag

  Ezt a teljes fájlt másold be vagy töltsd fel a ChatGPT-be, majd írd le neki, mit szeretnél módosítani a weboldalon.

  ## Utasítás a ChatGPT számára

  Egy statikus, GitHub Pages-en futó portfolio-weboldal teljes szöveges fejlesztői csomagját kapod meg. Segíts a felhasználónak beszélgetés közben megtervezni és elkészíteni a kért változtatásokat.

  Fontos szabályok:

  1. A publikus kezdőoldal az `index.html`. Az `elso-oldal.html` egy régi, megőrzött másolat, ezért nincs a csomagban és nem kell módosítani.
  2. Nincs build rendszer és nincs keretrendszer. A webhely sima HTML, CSS és JavaScript, közvetlenül GitHub Pages-en fut.
  3. Tartsd meg a meglévő reszponzív működést, akadálymentességet, SEO metaadatokat és a fájlok relatív elérési útjait.
  4. Ne találj ki új kép- vagy videófájlnevet. Csak a lent felsorolt, már használt médiafájlokra hivatkozz, kivéve ha a felhasználó külön jelzi, hogy új fájlt fog adni.
  5. Módosítás után csak a megváltozott fájlokat add vissza, de azokat teljes tartalommal. Ne használj `...`, „a többi változatlan” vagy más kihagyást.
  6. Minden visszaadott fájl pontosan ezt a formátumot használja (a fájljelölő sorok a kódblokkon kívül legyenek):

  <FILE path="styles.css">

  ~~~css
  a teljes fájl tartalma
  ~~~

  </FILE>

  7. A kódblokkok után röviden sorold fel, mit változtattál. Ha a kérés nem egyértelmű, előbb kérdezz vissza, és csak utána generálj fájlokat.
  8. A válaszod később egy kódoló asszisztenshez lesz bemásolva, amely a `<FILE path="...">` blokkok alapján alkalmazza és ellenőrzi a módosításokat.

  ## Projektfelépítés

  - `index.html`: az élő főoldal és annak tartalma
  - `showreel/index.html`: külön showreel aloldal
  - `styles.css`: a teljes oldal és az aloldal közös megjelenése, reszponzív szabályokkal
  - `script.js`: navigáció, animációk, videók, galéria és interakciók
  - `favicon.svg`, `robots.txt`, `sitemap.xml`, `CNAME`: publikálási és SEO fájlok
  - `README.md`: rövid telepítési leírás

  ## A kódban jelenleg használt médiafájlok

  - `optimized/hero-background-1200.jpg`
  - `optimized/vida-benedek-music-video-reel-2026-mobile.mp4`
  - `optimized/vida-benedek-music-video-reel-2026.mp4`
  - `optimized/lenkke-1280.jpg`
  - `optimized/videoclip-001-1280.jpg`
  - `optimized/videoclip-002-1280.jpg`
  - `optimized/videoclip-003-1280.jpg`
  - `optimized/videoclip-005-1280.jpg`
  - `clip-stills-mobile/frame-001.jpg`
  - `clip-stills-mobile/frame-002.jpg`
  - `clip-stills-mobile/frame-003.jpg`
  - `VIDA_BENEDEK_SHOWREEL_2025.mp4`

  ## Forrásfájlok

  Az egyes fájlok tartalma a `<PROJECT_FILE path="...">` jelölések között található. Ezek a jelölések nem részei a tényleges fájloknak.
MARKDOWN

sections = PROJECT_FILES.map do |path|
  language = LANGUAGE_BY_EXTENSION.fetch(File.extname(path).downcase, "text")
  contents = File.read(path, encoding: "UTF-8").rstrip
  "\n<PROJECT_FILE path=\"#{path}\">\n\n~~~#{language}\n#{contents}\n~~~\n\n</PROJECT_FILE>\n"
end

File.write(OUTPUT_PATH, "#{header}#{sections.join}\n", encoding: "UTF-8")
puts "Elkészült: #{OUTPUT_PATH}"
