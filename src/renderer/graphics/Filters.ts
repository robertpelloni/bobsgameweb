import { Filter, GlProgram } from 'pixi.js';

export const CRT_VERTEX = `
    attribute vec2 aVertexPosition;
    attribute vec2 aTextureCoord;
    uniform mat3 projectionMatrix;
    varying vec2 vTextureCoord;
    void main(void) {
        gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
        vTextureCoord = aTextureCoord;
    }
`;

export const CRT_FRAGMENT = `
    precision mediump float;
    varying vec2 vTextureCoord;
    uniform sampler2D uSampler;
    uniform float uTime;

    void main(void) {
        vec2 uv = vTextureCoord;
        
        // Scanlines
        float scanline = sin(uv.y * 800.0 + uTime * 5.0) * 0.04;
        vec4 color = texture2D(uSampler, uv);
        
        // Slight chromatic aberration
        float r = texture2D(uSampler, uv + vec2(0.001, 0.0)).r;
        float g = color.g;
        float b = texture2D(uSampler, uv - vec2(0.001, 0.0)).b;
        
        gl_FragColor = vec4(r - scanline, g - scanline, b - scanline, color.a);
    }
`;

export class PostProcessing {
    public static createCRTFilter(): Filter {
        return new Filter({
            glProgram: GlProgram.from({ vertex: CRT_VERTEX, fragment: CRT_FRAGMENT }),
            resources: {
                uTime: { value: 0, type: 'f32' }
            }
        });
    }
}
