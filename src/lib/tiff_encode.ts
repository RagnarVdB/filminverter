// @ts-nocheck
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

function writeint(buff, p, n) {
    n = n | 0 // force 32-bit signed two's-complement
    buff[p] = (n >> 24) & 255
    buff[p + 1] = (n >> 16) & 255
    buff[p + 2] = (n >> 8) & 255
    buff[p + 3] = (n >> 0) & 255
}

function writefloat(buff, p, n) {
    UTIF._binBE.fl32[0] = n
    for (var i = 0; i < 4; i++) {
        buff[p + i] = UTIF._binBE.ui8[3 - i] // write BE
    }
}

const writer = function (bin, data, offset, ifd) {
    var keys = Object.keys(ifd)
    bin.writeUshort(data, offset, keys.length)
    offset += 2

    var eoff = offset + keys.length * 12 + 4

    for (var ki = 0; ki < keys.length; ki++) {
        var key = keys[ki]
        var tag = parseInt(key.slice(1)),
            type = UTIF.ttypes[tag]
        if (type == null) throw new Error("unknown type of tag: " + tag)
        var val = ifd[key]
        if (type == 2) val = val[0] + "\u0000"
        var num = val.length
        console.log(`Writing ${key}: ${val}, ${type}, ${num}`)
        bin.writeUshort(data, offset, tag)
        offset += 2
        bin.writeUshort(data, offset, type)
        offset += 2
        bin.writeUint(data, offset, num)
        offset += 4

        var dlen = [-1, 1, 1, 2, 4, 8, 0, 0, 0, 0, 8, 4, 8][type] * num
        var toff = offset
        if (dlen > 4) {
            bin.writeUint(data, offset, eoff)
            toff = eoff
        }

        if (type == 1) {
            if (typeof val === "number") bin.writeUbyte(data, toff, val)
            else if (Array.isArray(val))
                for (let i = 0; i < num; i++) data[toff + i] = val[i] & 0xff
        }
        if (type == 2) {
            bin.writeASCII(data, toff, val)
        }
        if (type == 3) {
            for (var i = 0; i < num; i++)
                bin.writeUshort(data, toff + 2 * i, val[i])
        }
        if (type == 4) {
            for (var i = 0; i < num; i++)
                bin.writeUint(data, toff + 4 * i, val[i])
        }
        if (type == 5) {
            for (var i = 0; i < num; i++) {
                bin.writeUint(data, toff + 8 * i, Math.round(val[i] * 10000))
                bin.writeUint(data, toff + 8 * i + 4, 10000)
            }
        }
        if (type == 10) {
            for (var i = 0; i < num; i++) {
                writeint(data, toff + 8 * i, Math.round(val[i] * 10000))
                writeint(data, toff + 8 * i + 4, 10000)
            }
        }
        if (type == 11) {
            for (var i = 0; i < num; i++) {
                writefloat(data, toff + 4 * i, val[i])
            }
        }
        if (type == 12) {
            for (var i = 0; i < num; i++)
                bin.writeDouble(data, toff + 8 * i, val[i])
        }

        if (dlen > 4) {
            dlen += dlen & 1
            eoff += dlen
        }
        offset += 4
    }
    return [offset, eoff]
}

export function encodeDNG(
    im: ArrayBuffer,
    channels: 3 | 4,
    w: number,
    h: number,
    metadata: any
) {
    UTIF._writeIFD = writer
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
        t254: [0],
        t256: [w],
        t257: [h],
        t258: Array(channels).fill(dpth),
        t259: [cmpr],
        t262: [34892],
        t273: offs, // strips offset
        t274: [1], // Newsubfiletype
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
        // DNG Specific
        t50706: [1, 4, 0, 0], // DNGVersion
        t50707: [1, 4, 0, 0], // DNGBackwardVersion
        // t50708: ["Fujifilm X-T3"],
        t50708: ["Film negative"],
        t50714: Array(channels).fill(0), // BlackLevel per channel
        t50717: Array(channels).fill(65535), // WhiteLevel per channel
        t50721: [
            // XYZ to sRGB
            3.2404542, -1.5371385, -0.4985314, -0.969266, 1.8760108, 0.041556,
            0.0556434, -0.2040259, 1.0572252,
        ],
        t50728: [1.0, 1.0, 1.0], // AsShotNeutral
        t50940: [0, 0, 1, 1],
    }
    if (channels == 4) ifd["t338"] = [2]
    if (metadata) {
        for (const i in metadata) {
            ifd[i] = metadata[i]
        }
    }

    // ifd.t50712 = [1] // LinearRaw = yes
    // ifd.t50730 = [-2.0] // BaselineExposure (optional)
    // ifd.t50778 = [21] // CalibrationIlluminant1 = D65

    // @ts-ignore
    UTIF.ttypes = {
        254: 3,
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
        50706: 1, // DNGVersion (4 bytes)
        50707: 1, // DNGBackwardVersion (4 bytes)
        50708: 2, // UniqueCameraModel (ASCII)
        50712: 3, // LinearRaw (SHORT)
        50714: 3, // BlackLevel (SHORT per channel)
        50717: 3, // WhiteLevel (SHORT per channel)
        50721: 10, // ColorMatrix1 (RATIONAL)
        50728: 5, // AsShotNeutral (short)
        50730: 1, // BaselineExposure (DOUBLE)
        50778: 3, // CalibrationIlluminant1 (SHORT)
        50940: 11,
    }

    const prfx = new Uint8Array(UTIF.encode([ifd]))
    const data = new Uint8Array(psz + tsz)
    console.log(prfx.length, data.length, psz, tsz)
    data.set(prfx, 0)
    for (let i = 0; i < prts.length; i++) data.set(prts[i], offs[i])
    return data.buffer
}
