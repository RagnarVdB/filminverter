//@ts-ignore
import vertex_shader from "./glsl/vertex_shader.glsl"
//@ts-ignore
import fragment_color from "./glsl/fragment_color.glsl"
//@ts-ignore
import fragment_bw from "./glsl/fragment_bw.glsl"
import { getConversionValuesBw, getConversionValuesColor } from "./inversion"
import {
    trich_to_APD,
    cam_to_sRGB,
    cdd_to_cid,
    exp_to_sRGB,
    single_to_APD,
} from "./matrices"
import type { AdvancedSettings, BWSettings, ProcessedImage } from "./RawImage"
import { transpose, type Triple } from "./utils"

interface WebGLArgument<T extends unknown[]> {
    name: string
    f: (location: WebGLUniformLocation, ...data: T) => void
    data: T
}

function webGlDraw(
    gl: WebGL2RenderingContext,
    img: Uint16Array,
    w: number,
    h: number,
    fragment_shader: string,
    parameters: WebGLArgument<unknown[]>[]
) {
    // program
    if (!gl) {
        throw new Error("No gl")
    }
    const program: any = gl.createProgram()
    if (!program) {
        throw new Error("No program")
    }
    const ext = gl.getExtension("EXT_color_buffer_float")
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA16F, 256, 256)

    // texture
    const tex = gl.createTexture() // create empty texture
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    // buffer
    const buffer = gl.createBuffer()
    const bufferData = new Float32Array([
        -1, -1, 1, -1, 1, 1, 1, 1, -1, 1, -1, -1,
    ])
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, bufferData, gl.STATIC_DRAW)

    // shaders
    program.vs = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(program.vs, vertex_shader)

    program.fs = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(program.fs, fragment_shader)

    gl.compileShader(program.vs)
    checkCompileError(program.vs)
    gl.compileShader(program.fs)
    checkCompileError(program.fs)

    function checkCompileError(s: WebGLShader) {
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(s))
        }
    }

    gl.attachShader(program, program.vs)
    gl.attachShader(program, program.fs)
    gl.deleteShader(program.vs)
    gl.deleteShader(program.fs)

    // program
    gl.bindAttribLocation(program, 0, "vertex")
    gl.linkProgram(program)
    gl.useProgram(program)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)

    // Load image
    gl.texImage2D(
        gl.TEXTURE_2D, // target
        0, // mip level
        gl.RGBA16UI, // internal format -> gl.RGBA16UI
        w,
        h, // width and height
        0, // border
        gl.RGBA_INTEGER, //format -> gm.RGBA_INTEGER
        gl.UNSIGNED_SHORT,
        // gl.UNSIGNED_BYTE, // type -> gl.UNSIGNED_SHORT
        img // texture dat
    )

    for (const parameter of parameters) {
        const { name, f, data } = parameter
        const loc = gl.getUniformLocation(program, name)
        if (!loc) {
            throw new Error("Could not find uniform " + name)
        }
        f.apply(gl, [loc, ...data])
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6) // execute program
}

function getShaderParamsColor(
    gl: WebGL2RenderingContext,
    settings: AdvancedSettings,
    kind: "normal" | "trichrome" | "density"
): WebGLArgument<any[]>[] {
    const { m, b, d, dmin } = getConversionValuesColor(settings, kind)
    const APD_matrix = kind == "trichrome" ? trich_to_APD : single_to_APD
    const parameters: WebGLArgument<any[]>[] = [
        {
            name: "toe",
            f: gl.uniform1i,
            data: [settings.toe === true ? 1 : 0],
        },
        {
            name: "cam_to_apd",
            f: gl.uniformMatrix3fv,
            data: [false, transpose(APD_matrix).matrix],
        },
        {
            name: "cam_to_sRGB",
            f: gl.uniformMatrix3fv,
            data: [false, transpose(cam_to_sRGB).matrix],
        },
        // {
        //     name: "cdd_to_cid",
        //     f: gl.uniformMatrix3fv,
        //     data: [false, transpose(cdd_to_cid).matrix],
        // },
        // {
        //     name: "exp_to_sRGBMatrix",
        //     f: gl.uniformMatrix3fv,
        //     data: [false, transpose(exp_to_sRGB).matrix],
        // },
        { name: "m", f: gl.uniform3f, data: m },
        { name: "b", f: gl.uniform3f, data: b },
        { name: "d", f: gl.uniform3f, data: d },
        { name: "dmin", f: gl.uniform3f, data: dmin },

        // {
    ]
    return parameters
}

function getShaderParamsBw(
    gl: WebGL2RenderingContext,
    settings: BWSettings,
    kind: "normal" | "trichrome" | "density"
): WebGLArgument<any[]>[] {
    if (kind == "trichrome") {
        throw new Error("BW not supported for trichrome")
    } else {
        const { m, b, d, dmin } = getConversionValuesBw(settings)
        return [
            {
                name: "toe",
                f: gl.uniform1i,
                data: [settings.toe ? 1 : 0],
            },
            { name: "m", f: gl.uniform1f, data: [m] },
            { name: "b", f: gl.uniform3f, data: b },
            { name: "d", f: gl.uniform1f, data: [d] },
            { name: "dmin", f: gl.uniform3f, data: dmin },
        ]
    }
}

export function draw(gl: WebGL2RenderingContext, image: ProcessedImage) {
    if (!gl) console.log("No gl")

    const w = image.width
    const h = image.height
    const im = image.image
    const img = im

    const rot = image.settings.rotationMatrix.matrix
    const zoom = image.settings.zoom

    const show_clipping = image.settings.show_clipping
    const show_negative = image.settings.show_negative

    const mode = image.settings.mode
    const shader = mode == "bw" ? fragment_bw : fragment_color
    const fragment_parameters =
        mode == "bw"
            ? getShaderParamsBw(gl, image.settings.bw, image.kind)
            : getShaderParamsColor(gl, image.settings.advanced, image.kind)

    const wb = image.wb_coeffs
    const wb_coeffs = [wb[0] / wb[1], 1, wb[2] / wb[1]]
    const clip_values = wb_coeffs.map((x) => Math.log2(x * image.DR))

    const parameters: WebGLArgument<any[]>[] = [
        { name: "rot", f: gl.uniformMatrix2fv, data: [false, rot] },
        { name: "scale", f: gl.uniform2f, data: [zoom[0] / 2, zoom[1] / 2] },
        { name: "trans", f: gl.uniform2f, data: [zoom[2], zoom[3]] },
        {
            name: "show_clipping",
            f: gl.uniform1i,
            data: [show_clipping ? 1 : 0],
        },
        {
            name: "show_negative",
            f: gl.uniform1i,
            data: [show_negative ? 1 : 0],
        },
        {
            name: "clip_values",
            f: gl.uniform3f,
            data: clip_values,
        },
        ...fragment_parameters,
    ]

    webGlDraw(gl, img, w, h, shader, parameters)
}
