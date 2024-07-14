/**
 * All uniform vriables must be passed in on 16-byte alignment
 */
export const UNIFORM_ALIGNMENT = 16;

export type WebGPUDims = 2 | 3 | 4;

export type WebGPUScalar = "u32" | "i32" | "f32";

export type WebGPUVec<
  L extends WebGPUDims,
  T extends WebGPUScalar
> = `vec${L}<${T}>`;
export type WebGPUVecAnyBase = WebGPUVec<WebGPUDims, WebGPUScalar>;

export type WebGPUMat<
  Col extends WebGPUDims,
  Row extends WebGPUDims,
  T extends WebGPUScalar
> = `mat${Col}x${Row}<${T}>`;
export type WebGPUMatAnyBase = WebGPUMat<WebGPUDims, WebGPUDims, WebGPUScalar>;

export type WebGPUBaseType = WebGPUScalar | WebGPUVecAnyBase | WebGPUMatAnyBase;

export const WEBGPU_ALIAS = {
  vec2i: "vec2<i32>",
  vec3i: "vec3<i32>",
  vec4i: "vec4<i32>",
  vec2u: "vec2<u32>",
  vec3u: "vec3<u32>",
  vec4u: "vec4<u32>",
  vec2f: "vec2<f32>",
  vec3f: "vec3<f32>",
  vec4f: "vec4<f32>",
  mat2x2f: "mat2x2<f32>",
  mat2x3f: "mat2x3<f32>",
  mat2x4f: "mat2x4<f32>",
  mat3x2f: "mat3x2<f32>",
  mat3x3f: "mat3x3<f32>",
  mat3x4f: "mat3x4<f32>",
  mat4x2f: "mat4x2<f32>",
  mat4x3f: "mat4x3<f32>",
  mat4x4f: "mat4x4<f32>",
} as const satisfies Record<string, WebGPUBaseType>;

export type WebGPUType = WebGPUBaseType | keyof typeof WEBGPU_ALIAS;
export type Dealias<T extends WebGPUType> = T extends keyof typeof WEBGPU_ALIAS
  ? (typeof WEBGPU_ALIAS)[T]
  : T;

export type WebGPUVecAny =
  | WebGPUVecAnyBase
  | "vec2i"
  | "vec3i"
  | "vec4i"
  | "vec2u"
  | "vec3u"
  | "vec4u"
  | "vec2f"
  | "vec3f"
  | "vec4f";

export type WebGPUMatAny =
  | WebGPUMatAnyBase
  | "mat2x2f"
  | "mat2x3f"
  | "mat2x4f"
  | "mat3x2f"
  | "mat3x3f"
  | "mat3x4f"
  | "mat4x2f"
  | "mat4x3f"
  | "mat4x4f";

export function dealias<K extends keyof typeof WEBGPU_ALIAS>(
  type: K
): (typeof WEBGPU_ALIAS)[K];
export function dealias<T extends WebGPUBaseType>(type: T): T;
export function dealias(type: WebGPUVecAny): WebGPUVecAnyBase;
export function dealias(type: WebGPUMatAny): WebGPUMatAnyBase;
export function dealias(type: WebGPUType): WebGPUBaseType;
export function dealias(type: WebGPUType): WebGPUBaseType {
  // @ts-expect-error
  return WEBGPU_ALIAS[type] ?? type;
}
