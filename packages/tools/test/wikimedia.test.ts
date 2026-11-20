import { describe, expect, it } from "vitest";
import { cleanAuthor, isAllowedLicense, licenseLabel, normTitle, pickClaim, stripHtml } from "../src/images/wikimedia.ts";
import { CATALOG } from "../src/images/catalog.ts";

const claim = (file: string, start?: string, end?: string, rank = "normal") => ({
  rank,
  mainsnak: { datavalue: { value: file } },
  qualifiers: {
    ...(start ? { P580: [{ datavalue: { value: { time: start } } }] } : {}),
    ...(end ? { P582: [{ datavalue: { value: { time: end } } }] } : {}),
  },
});

describe("pickClaim", () => {
  it("prend le drapeau en usage en 1936", () => {
    const claims = [
      claim("Flag of Germany.svg", "+1949-05-23T00:00:00Z", undefined, "preferred"),
      claim("Flag of Germany (1933–1935).svg", "+1933-03-12T00:00:00Z", "+1935-09-15T00:00:00Z"),
      claim("Flag of Germany (1935–1945).svg", "+1935-09-15T00:00:00Z", "+1945-05-23T00:00:00Z"),
    ];
    expect(pickClaim(claims, 1936)).toBe("Flag of Germany (1935–1945).svg");
  });
  it("prend sinon une image sans date, de rang préféré d'abord", () => {
    expect(pickClaim([claim("a.jpg"), claim("b.jpg", undefined, undefined, "preferred")], 1936)).toBe("b.jpg");
  });
  it("ignore les images dépréciées et les listes vides", () => {
    expect(pickClaim([claim("a.jpg", undefined, undefined, "deprecated")], 1936)).toBeUndefined();
    expect(pickClaim(undefined, 1936)).toBeUndefined();
  });
});

describe("licences", () => {
  it("accepte le domaine public et les Creative Commons libres", () => {
    expect(isAllowedLicense("pd", "Public domain")).toBe(true);
    expect(isAllowedLicense("cc0", "CC0")).toBe(true);
    expect(isAllowedLicense("cc-by-sa-4.0", "CC BY-SA 4.0")).toBe(true);
    expect(isAllowedLicense("cc-by-2.0", "CC BY 2.0")).toBe(true);
    expect(isAllowedLicense("attribution", "Attribution")).toBe(true);
  });
  it("refuse les licences non commerciales, sans modification ou GFDL seule", () => {
    expect(isAllowedLicense("cc-by-nc-sa-2.0", "CC BY-NC-SA 2.0")).toBe(false);
    expect(isAllowedLicense("cc-by-nd-4.0", "CC BY-ND 4.0")).toBe(false);
    expect(isAllowedLicense("gfdl", "GFDL")).toBe(false);
    expect(isAllowedLicense(undefined, undefined)).toBe(false);
  });
  it("affiche le domaine public en français", () => {
    expect(licenseLabel("Public domain", "pd")).toBe("Domaine public");
    expect(licenseLabel("CC BY-SA 3.0", "cc-by-sa-3.0")).toBe("CC BY-SA 3.0");
  });
});

describe("texte", () => {
  it("nettoie les auteurs venus de Commons", () => {
    expect(stripHtml('<a href="//x">Agence&nbsp;Meurisse</a>\n')).toBe("Agence Meurisse");
    expect(cleanAuthor("<span>Unknown author</span> <span>Unknown author</span>")).toBe("Auteur inconnu");
    expect(cleanAuthor("Yann Caradec")).toBe("Yann Caradec");
  });
  it("compare les titres comme Wikipédia", () => {
    expect(normTitle("char_B1")).toBe("Char B1");
  });
});

describe("catalogue", () => {
  it("a des identifiants uniques et bien formés", () => {
    const ids = CATALOG.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z]+:[A-Za-z0-9-]+$/);
  });
});
