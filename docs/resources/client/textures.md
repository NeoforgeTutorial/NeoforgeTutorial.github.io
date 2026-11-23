# 纹理

Minecraft 中的所有纹理都是位于命名空间 `textures` 文件夹内的 PNG 文件。不支持 JPG、GIF 以及其他图像格式。引用纹理的[标识符]路径通常相对于 `textures` 文件夹，例如，标识符 `examplemod:block/example_block` 指向纹理文件 `assets/examplemod/textures/block/example_block.png`。

纹理尺寸通常应为 2 的幂，例如 16x16 或 32x32。与旧版本不同，现代 Minecraft 原生支持大于 16x16 的方块和物品纹理。如果纹理尺寸不是 2 的幂，而且由你自己渲染（例如 GUI 背景），请创建一个空白的、尺寸为下一个可用 2 的幂的文件（通常是 256x256），把你的纹理放在文件左上角，其余部分留空。之后可以在使用该纹理的代码中设置实际绘制的纹理尺寸。

## 纹理元数据 {#texture-metadata}

纹理元数据可以写在名称与纹理完全相同、末尾附加 `.mcmeta` 的文件中。例如，位于 `textures/block/example.png` 的动画纹理需要一个配套的 `textures/block/example.png.mcmeta` 文件。`.mcmeta` 文件格式如下（所有字段均可选）：

```json5
{
    // 普通纹理的元数据
    "texture": {
        // 需要时是否模糊纹理。默认为 false。
        // 目前由 codec 指定，但在文件和代码中均未实际使用。
        "blur": true,
        // 需要时是否钳制纹理。默认为 false。
        // 目前由 codec 指定，但在文件和代码中均未实际使用。
        "clamp": true,
        // 设置生成 mipmap（远距离使用的低分辨率纹理）时采用的策略。
        // 可以是：
        // - `mean`：默认策略，取四个像素颜色的平均值。
        // - `cutout`：与 `mean` 相同，但所有层级都由原始纹理而非相邻 mipmap 生成，
        //   并用 0.2 作为阈值把 alpha 值吸附到 0 或 1。
        // - `strict_cutout`：与 `cutout` 相同，但使用 0.6 作为 alpha 吸附阈值。
        // - `dark_cutout`：与 `mean` 相同，但只有 alpha 不为 0 的周围像素参与平均。
        "mipmap_strategy": "mean",
        // 调整决定 mipmap 中像素应完全透明还是完全不透明时的 alpha 截止值。
        // 例如，使用 `cutout` 策略时设为 0.3，alpha 吸附值会变成 0.2 + 0.3 = 0.5。
        "alpha_cutoff_bias": 0.3
    },

    // 作为 GUI 精灵使用的纹理的元数据
    "gui": {
        // 指定需要时如何缩放纹理。可以是以下三种之一：
        "scaling": {
            "type": "stretch" // 默认
        },
        "scaling": {
            "type": "tile",
            "width": 16,
            "height": 16
        },
        "scaling": {
            // 与 "tile" 类似，但允许指定边缘偏移。
            "type": "nine_slice",
            "width": 16,
            "height": 16,
            // 也可以是一个整数，用作四边的值。
            "border": {
                "left": 0,
                "top": 0,
                "right": 0,
                "bottom": 0
            },
            // 为 true 时，纹理中心部分会像 stretch 类型一样应用，
            // 而不是进行九宫格平铺。
            "stretch_inner": true
        }
    },

    // 动画纹理的元数据
    // 见下文
    "animation": {}
}
```

## 动画纹理 {#animated-textures}

Minecraft 原生支持方块和物品的动画纹理。动画纹理的各动画阶段从上到下排列在同一个纹理文件中（例如，具有 8 个阶段的 16x16 动画纹理由一个 16x128 PNG 文件表示）。

要让纹理真正播放动画，而不只是显示为拉伸变形的静态图像，纹理元数据中必须有 `animation` 对象。该子对象可以为空，但可包含以下可选字段：

```json5
{
    "animation": {
        // 自定义帧播放顺序。省略时从上到下播放。
        "frames": [1, 0],
        // 一帧在切换到下一个动画阶段前停留的时长，以帧为单位。默认为 1。
        "frametime": 5,
        // 是否在动画阶段之间插值。默认为 false。
        "interpolate": true,
        // 一个动画阶段的宽和高。省略时两者都使用纹理宽度。
        "width": 12,
        "height": 12
    }
}
```

[identifiers]: ../../misc/identifier.md
