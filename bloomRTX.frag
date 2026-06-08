#pragma header

// RTX Bloom Configuration
uniform float brighnessThreshold = 0.3; // How bright a pixel must be to bleed/glow
uniform float bloomIntensity = 2.5;     // Overall glow power
uniform float dirtMaskIntensity = 10.0; // Corresponds to your HLSL dirtIntensityParams.x

// Texture samplers passed from Haxe
uniform sampler2D dirtMask;
uniform bool useDirtMask = false;

void main() {
    vec2 uv = openfl_TextureCoordv;
    vec4 baseColor = flixel_texture2D(bitmap, uv);
    
    // 1. Calculate pixel luminance (brightness)
    float luminance = dot(baseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
    
    // 2. Isolate threshold for the "RTX" emissive glow pass
    vec3 bloomPass = vec3(0.0);
    if (luminance > brighnessThreshold) {
        // Smoothly extract the bright elements
        bloomPass = baseColor.rgb * (luminance - brighnessThreshold) * bloomIntensity;
    }
    
    // 3. Simple high-performance pseudo-blur sample (mimicking 3D light bleed)
    vec3 blur = vec3(0.0);
    float samples = 8.0;
    float radius = 0.005; // Bleed radius
    
    for (float i = 0.0; i < 8.0; i++) {
        float angle = i * (6.28318 / samples);
        vec2 offset = vec2(cos(angle), sin(angle)) * radius;
        vec4 sampleColor = flixel_texture2D(bitmap, uv + offset);
        float sampleLum = dot(sampleColor.rgb, vec3(0.2126, 0.7152, 0.0722));
        if (sampleLum > brighnessThreshold) {
            blur += sampleColor.rgb;
        }
    }
    blur /= samples;
    
    // 4. Handle Lens Dirt Overlay (Replicating your DIRT_MASK_MAP logic)
    vec3 dirtComponent = vec3(0.0);
    if (useDirtMask) {
        vec4 dirtTex = texture2D(dirtMask, uv);
        dirtComponent = blur * dirtTex.rgb * dirtMaskIntensity;
    }
    
    // 5. Composite the final frame
    vec3 finalRGB = baseColor.rgb + (blur * bloomIntensity) + dirtComponent;
    
    gl_FragColor = vec4(finalRGB, baseColor.a);
}
