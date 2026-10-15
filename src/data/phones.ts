
export type PhoneSeries = { id: string; name: string; examples?: string }
export type PhoneBrand = { id: string; name: string; os: "android" | "iphone"; series: PhoneSeries[] }

export const OTHER_BRAND = "otra"
export const UNKNOWN = "no-se"

export const PHONE_BRANDS: PhoneBrand[] = [
  {
    id: "samsung", name: "Samsung", os: "android", series: [
      { id: "galaxy-a", name: "Galaxy A", examples: "A05, A15, A25, A35, A55" },
      { id: "galaxy-s", name: "Galaxy S", examples: "S23, S24, S25" },
      { id: "galaxy-m", name: "Galaxy M", examples: "M14, M15, M34" },
      { id: "galaxy-z", name: "Galaxy Z (de los que se doblan)", examples: "Z Flip, Z Fold" },
      { id: "galaxy-note", name: "Galaxy Note", examples: "Note 10, Note 20" },
    ],
  },
  {
    id: "motorola", name: "Motorola", os: "android", series: [
      { id: "moto-g", name: "Moto G", examples: "G24, G34, G54, G84" },
      { id: "moto-e", name: "Moto E", examples: "E13, E14, E22" },
      { id: "edge", name: "Edge", examples: "Edge 40, Edge 50" },
      { id: "razr", name: "Razr (de los que se doblan)", examples: "Razr 40, Razr 50" },
    ],
  },
  {
    id: "xiaomi", name: "Xiaomi", os: "android", series: [
      { id: "redmi", name: "Redmi", examples: "Redmi 13C, Redmi 14C, Redmi A3" },
      { id: "redmi-note", name: "Redmi Note", examples: "Note 12, Note 13, Note 14" },
      { id: "poco", name: "POCO", examples: "POCO X6, POCO M6, POCO F6" },
      { id: "xiaomi", name: "Xiaomi (número)", examples: "Xiaomi 13T, Xiaomi 14T" },
    ],
  },
  {
    id: "apple", name: "Apple (iPhone)", os: "iphone", series: [
      { id: "iphone-new", name: "iPhone 15 o más reciente" },
      { id: "iphone-12-14", name: "iPhone 12, 13 o 14" },
      { id: "iphone-old", name: "iPhone 11 o anterior" },
      { id: "iphone-se", name: "iPhone SE (con botón redondo abajo)" },
    ],
  },
  {
    id: "huawei", name: "Huawei", os: "android", series: [
      { id: "nova", name: "Nova", examples: "Nova 11, Nova 12" },
      { id: "y", name: "Y", examples: "Y61, Y70, Y90" },
      { id: "pura", name: "P o Pura", examples: "P30, P60, Pura 70" },
      { id: "mate", name: "Mate", examples: "Mate 50, Mate 60" },
    ],
  },
  {
    id: "honor", name: "Honor", os: "android", series: [
      { id: "x", name: "Honor X", examples: "X6, X7, X8" },
      { id: "numero", name: "Honor (número)", examples: "Honor 90, Honor 200" },
      { id: "magic", name: "Magic", examples: "Magic 6" },
    ],
  },
  {
    id: "oppo", name: "OPPO", os: "android", series: [
      { id: "a", name: "OPPO A", examples: "A18, A38, A60" },
      { id: "reno", name: "Reno", examples: "Reno 10, Reno 11, Reno 12" },
      { id: "find", name: "Find", examples: "Find X" },
    ],
  },
  {
    id: "realme", name: "Realme", os: "android", series: [
      { id: "c", name: "Realme C", examples: "C51, C53, C67" },
      { id: "numero", name: "Realme (número)", examples: "Realme 11, Realme 12" },
      { id: "note", name: "Realme Note", examples: "Note 50" },
    ],
  },
  {
    id: "vivo", name: "Vivo", os: "android", series: [
      { id: "y", name: "Vivo Y", examples: "Y17s, Y28, Y36" },
      { id: "v", name: "Vivo V", examples: "V29, V30" },
    ],
  },
  {
    id: "zte", name: "ZTE", os: "android", series: [
      { id: "blade", name: "Blade", examples: "Blade A54, Blade V50" },
      { id: "nubia", name: "Nubia", examples: "Nubia Neo" },
    ],
  },
  {
    id: "google", name: "Google Pixel", os: "android", series: [
      { id: "pixel", name: "Pixel", examples: "Pixel 8, Pixel 9" },
      { id: "pixel-a", name: "Pixel «a»", examples: "Pixel 7a, Pixel 8a" },
    ],
  },
]

export const findBrand = (id?: string) => PHONE_BRANDS.find((b) => b.id === id)


export function describePhone(brandId?: string, seriesId?: string, exact?: string) {
  const detail = exact?.trim()
  if (!brandId || brandId === UNKNOWN) return ""
  if (brandId === OTHER_BRAND) return detail ?? ""
  const brand = findBrand(brandId)
  if (!brand) return detail ?? ""
  const series = brand.series.find((s) => s.id === seriesId)
  const os = brand.os === "iphone" ? "iPhone" : "Android"
  return `${brand.name}${series ? ` ${series.name}` : ""}${detail ? ` (${detail})` : ""} · ${os}`
}

const simplify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")

/** Para la voz: "mi teléfono es un Samsung A15" → Samsung. */
export function findBrandInText(text: string) {
  const s = simplify(text)
  if (/\biphone\b|\bapple\b/.test(s)) return findBrand("apple")
  return PHONE_BRANDS.find((b) => s.includes(simplify(b.name.split(" ")[0])))
}