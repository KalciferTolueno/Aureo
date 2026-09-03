<template>
  <div ref="container" :class="className" aria-hidden="true" />
</template>

<script setup lang="ts">
// Adapted from Vue Bits Light Rays: https://vue-bits.dev/backgrounds/light-rays
import { Mesh, Program, Renderer, Triangle } from 'ogl'
import { onMounted, onUnmounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  className?: string
  color?: string
  speed?: number
  spread?: number
  length?: number
  pointerInfluence?: number
  fps?: number
  dpr?: number
  paused?: boolean
}>(), {
  className: '',
  color: '#c9a86a',
  speed: 0.45,
  spread: 0.85,
  length: 1.8,
  pointerInfluence: 0.06,
  fps: 30,
  dpr: 1.25,
  paused: false,
})

const container = ref<HTMLDivElement | null>(null)
let renderer: Renderer | undefined
let frame = 0
let visible = false
let intersectionObserver: IntersectionObserver | undefined
let resizeObserver: ResizeObserver | undefined
let removePointerListener: (() => void) | undefined
let lastRender = -Infinity

const vertex = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`

const fragment = `precision highp float;
uniform float iTime;
uniform vec2 iResolution;
uniform vec2 rayPos;
uniform vec2 rayDir;
uniform vec3 raysColor;
uniform float raysSpeed;
uniform float lightSpread;
uniform float rayLength;
uniform float pointerInfluence;
uniform vec2 mousePos;
varying vec2 vUv;

float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord,
                  float seedA, float seedB, float speed) {
  vec2 sourceToCoord = coord - raySource;
  vec2 dirNorm = normalize(sourceToCoord);
  float cosAngle = dot(dirNorm, rayRefDirection);
  float spreadFactor = pow(max(cosAngle, 0.0), 1.0 / max(lightSpread, 0.001));
  float distance = length(sourceToCoord);
  float maxDistance = iResolution.x * rayLength;
  float lengthFalloff = clamp((maxDistance - distance) / maxDistance, 0.0, 1.0);
  float fadeFalloff = clamp((iResolution.x - distance) / iResolution.x, 0.5, 1.0);
  float baseStrength = clamp(
    (0.45 + 0.15 * sin(cosAngle * seedA + iTime * speed)) +
    (0.3 + 0.2 * cos(-cosAngle * seedB + iTime * speed)),
    0.0, 1.0
  );
  return baseStrength * lengthFalloff * fadeFalloff * spreadFactor;
}

void main() {
  vec2 coord = vec2(gl_FragCoord.x, iResolution.y - gl_FragCoord.y);
  vec2 mouseDirection = normalize(mousePos * iResolution.xy - rayPos);
  vec2 finalRayDir = normalize(mix(rayDir, mouseDirection, pointerInfluence));
  vec4 rays1 = vec4(1.0) * rayStrength(rayPos, finalRayDir, coord, 36.2214, 21.11349, 1.5 * raysSpeed);
  vec4 rays2 = vec4(1.0) * rayStrength(rayPos, finalRayDir, coord, 22.3991, 18.0234, 1.1 * raysSpeed);
  vec4 color = rays1 * 0.5 + rays2 * 0.4;
  float brightness = 1.0 - (coord.y / iResolution.y);
  color.x *= 0.1 + brightness * 0.8;
  color.y *= 0.3 + brightness * 0.6;
  color.z *= 0.5 + brightness * 0.5;
  color.rgb *= raysColor;
  gl_FragColor = color;
}`

function rgb(hex: string): [number, number, number] {
  const value = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return value ? [parseInt(value[1]!, 16) / 255, parseInt(value[2]!, 16) / 255, parseInt(value[3]!, 16) / 255] : [1, 1, 1]
}

onMounted(() => {
  if (!container.value || matchMedia('(prefers-reduced-motion: reduce)').matches) return

  renderer = new Renderer({ dpr: Math.min(devicePixelRatio || 1, props.dpr), alpha: true, antialias: false })
  const gl = renderer.gl
  gl.canvas.style.width = '100%'
  gl.canvas.style.height = '100%'
  container.value.appendChild(gl.canvas)

  const nextUniforms = {
    iTime: { value: 0 },
    iResolution: { value: [1, 1] },
    rayPos: { value: [0, 0] },
    rayDir: { value: [0, 1] },
    raysColor: { value: rgb(props.color) },
    raysSpeed: { value: props.speed },
    lightSpread: { value: props.spread },
    rayLength: { value: props.length },
    pointerInfluence: { value: props.pointerInfluence },
    mousePos: { value: [0.5, 0.5] },
  }
  const mesh = new Mesh(gl, { geometry: new Triangle(gl), program: new Program(gl, { vertex, fragment, uniforms: nextUniforms }) })

  const resize = () => {
    if (!container.value || !renderer) return
    renderer.setSize(container.value.clientWidth, container.value.clientHeight)
    nextUniforms.iResolution.value = [gl.canvas.width, gl.canvas.height]
    nextUniforms.rayPos.value = [gl.canvas.width * 0.5, -gl.canvas.height * 0.2]
  }
  const render = (time: number) => {
    if (!renderer || !visible || props.paused) return
    if (time - lastRender >= 1000 / props.fps) {
      nextUniforms.iTime.value = time * 0.001
      renderer.render({ scene: mesh })
      lastRender = time
    }
    frame = requestAnimationFrame(render)
  }
  const scheduleRender = () => {
    cancelAnimationFrame(frame)
    if (visible && !props.paused) frame = requestAnimationFrame(render)
  }
  const pointer = (event: PointerEvent) => {
    if (!container.value) return
    const bounds = container.value.getBoundingClientRect()
    nextUniforms.mousePos.value = [(event.clientX - bounds.left) / bounds.width, (event.clientY - bounds.top) / bounds.height]
  }

  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(container.value)
  intersectionObserver = new IntersectionObserver(([entry]) => {
    if (!entry) return
    visible = entry.isIntersecting
    scheduleRender()
  }, { threshold: 0.1 })
  intersectionObserver.observe(container.value)
  window.addEventListener('pointermove', pointer, { passive: true })
  removePointerListener = () => window.removeEventListener('pointermove', pointer)
  resize()
  watch(() => props.paused, scheduleRender)
  watch(() => [props.color, props.spread, props.length, props.speed] as const, () => {
    nextUniforms.raysColor.value = rgb(props.color)
    nextUniforms.lightSpread.value = props.spread
    nextUniforms.rayLength.value = props.length
    nextUniforms.raysSpeed.value = props.speed
  })
})

onUnmounted(() => {
  cancelAnimationFrame(frame)
  intersectionObserver?.disconnect()
  resizeObserver?.disconnect()
  removePointerListener?.()
  renderer?.gl.getExtension('WEBGL_lose_context')?.loseContext()
})
</script>
