import { open } from 'node:fs/promises'

/**
 * 그림 파일의 가로·세로 — 헤더 앞부분만 읽어서 알아낸다.
 * 미디어 라이브러리 목록이 쓰는 값이라 외부 라이브러리를 더하지 않고 직접 읽는다.
 * 모르는 형식이면 null — 화면에서는 '—' 로 보여 준다.
 */
export interface ImageSize {
  width: number
  height: number
}

/** 헤더 앞 64KB — JPEG 는 마커를 따라가야 해서 넉넉히 읽는다. */
const HEAD = 64 * 1024

async function readHead(file: string): Promise<Buffer> {
  const fh = await open(file, 'r')
  try {
    const buf = Buffer.alloc(HEAD)
    const { bytesRead } = await fh.read(buf, 0, HEAD, 0)
    return buf.subarray(0, bytesRead)
  } finally {
    await fh.close()
  }
}

function png(b: Buffer): ImageSize | null {
  if (b.length < 24 || b.toString('ascii', 1, 4) !== 'PNG') return null
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) }
}

function gif(b: Buffer): ImageSize | null {
  if (b.length < 10 || b.toString('ascii', 0, 3) !== 'GIF') return null
  return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) }
}

/** JPEG — SOF 마커(해상도가 적힌 칸)를 찾을 때까지 세그먼트를 건너뛴다. */
function jpeg(b: Buffer): ImageSize | null {
  if (b.length < 4 || b.readUInt16BE(0) !== 0xffd8) return null
  let i = 2
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) {
      i++
      continue
    }
    const marker = b[i + 1]
    // SOF0~SOF15 중 해상도가 들어 있는 마커들 (0xc4·0xc8·0xcc 는 다른 용도)
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) }
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) {
      i += 2
      continue
    }
    i += 2 + b.readUInt16BE(i + 2)
  }
  return null
}

/** WebP — VP8 / VP8L / VP8X 세 가지 담김새가 각각 다른 자리에 적는다. */
function webp(b: Buffer): ImageSize | null {
  if (b.length < 30 || b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null
  const chunk = b.toString('ascii', 12, 16)
  if (chunk === 'VP8 ') return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff }
  if (chunk === 'VP8L') {
    const bits = b.readUInt32LE(21)
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
  }
  if (chunk === 'VP8X') {
    const w = b[24] | (b[25] << 8) | (b[26] << 16)
    const h = b[27] | (b[28] << 8) | (b[29] << 16)
    return { width: w + 1, height: h + 1 }
  }
  return null
}

/** SVG — width/height 속성, 없으면 viewBox 의 3·4번째 값 */
function svg(b: Buffer): ImageSize | null {
  const text = b.toString('utf8', 0, Math.min(b.length, 4096))
  if (!text.includes('<svg')) return null
  const attr = (name: string) => {
    const m = text.match(new RegExp(`${name}\\s*=\\s*["']\\s*([\\d.]+)`, 'i'))
    return m ? Math.round(Number(m[1])) : 0
  }
  const w = attr('width')
  const h = attr('height')
  if (w && h) return { width: w, height: h }
  const box = text.match(/viewBox\s*=\s*["']\s*[-\d.]+[,\s]+[-\d.]+[,\s]+([\d.]+)[,\s]+([\d.]+)/i)
  if (box) return { width: Math.round(Number(box[1])), height: Math.round(Number(box[2])) }
  return null
}

/** 파일 내용이 바뀌지 않으면 다시 읽지 않는다 — 목록은 자주 불린다. */
const cache = new Map<string, ImageSize | null>()

export async function imageSize(file: string, mtimeMs: number): Promise<ImageSize | null> {
  const key = `${file}:${mtimeMs}`
  const hit = cache.get(key)
  if (hit !== undefined) return hit
  let size: ImageSize | null = null
  try {
    const head = await readHead(file)
    size = png(head) ?? jpeg(head) ?? gif(head) ?? webp(head) ?? svg(head)
  } catch {
    size = null
  }
  if (cache.size > 2000) cache.clear()
  cache.set(key, size)
  return size
}
