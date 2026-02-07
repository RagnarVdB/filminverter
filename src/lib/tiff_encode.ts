import UTIF from "utif"

export function encodeImage(
    im: ArrayBuffer,
    channels: 3 | 4,
    w: number,
    h: number,
    metadata: any
) {
    const bpv = Math.round(im.byteLength / (w * h * channels))
    const dpth = bpv * 8
    let img = new Uint8Array(im)

    const cmpr = 1
    const ss = 1e6 // decoded strip size - 10 MB
    let rps = Math.min(h, 2 * ((ss / (w * channels * bpv)) >>> 1)),
        prts = [],
        offs = [],
        bcnt = [],
        tsz = 0
    const psz = 1000 + (metadata ? 1000 : 0) + Math.ceil(h / rps) * 8
    console.log("psz", psz, rps, channels)
    for (let y = 0; y < h; y += rps) {
        const pof = y * w * channels * bpv,
            pln = Math.min(img.length, (y + rps) * w * channels * bpv) - pof
        const prt = new Uint8Array(img.buffer, pof, pln)
        prts.push(prt)
        offs.push(psz + tsz)
        bcnt.push(prt.length)
        tsz += prt.length
    }
    const dtype_int = dpth == 32 ? 3 : 1
    //if(cmpr==8) img=pako.deflate(img);
    console.log(Array(channels).fill(dpth), Array(channels).fill(dtype_int))
    let ifd: any = {
        t256: [w],
        t257: [h],
        t258: Array(channels).fill(dpth),
        t259: [cmpr],
        t262: [2],
        t273: offs, // strips offset
        t277: [channels],
        t278: [rps],
        /* rows per strip */ t279: bcnt, // strip byte counts
        t282: [[72, 1]],
        t283: [[72, 1]],
        t284: [1],
        t286: [[0, 1]],
        t287: [[0, 1]],
        t296: [1],
        t305: ["Filminverter"],
        t339: Array(channels).fill(dtype_int),
    }
    if (channels == 4) ifd["t338"] = [2]
    if (metadata) {
        for (const i in metadata) {
            ifd[i] = metadata[i]
        }
    }

    // @ts-ignore
    UTIF.ttypes = {
        256: 3,
        257: 3,
        258: 3,
        259: 3,
        262: 3,
        273: 4,
        274: 3,
        277: 3,
        278: 4,
        279: 4,
        282: 5,
        283: 5,
        284: 3,
        286: 5,
        287: 5,
        296: 3,
        305: 2,
        306: 2,
        338: 3,
        513: 4,
        514: 4,
        34665: 4,
        339: 3,
    }

    const prfx = new Uint8Array(UTIF.encode([ifd]))
    const data = new Uint8Array(psz + tsz)
    console.log(prfx.length, data.length, psz, tsz)
    data.set(prfx, 0)
    for (let i = 0; i < prts.length; i++) data.set(prts[i], offs[i])
    return data.buffer
}
