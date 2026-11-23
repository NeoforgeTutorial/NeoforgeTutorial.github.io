# 屏幕 {#screens}

屏幕通常构成 Minecraft 中所有图形用户界面（GUI）的基础：接收用户输入，在服务端验证，再把结果同步回客户端。屏幕可以与[菜单][menus]结合，形成类似物品栏界面的通信网络；也可以独立存在，由模组开发者通过自己的[网络][network]实现处理。

屏幕由许多部分组成，因此很难一眼看清 Minecraft 中的“屏幕”究竟是什么。为此，本文先介绍屏幕的各个组成部分及其用法，再讨论屏幕本身。

## 渲染 GUI {#rendering-a-gui}

GUI 渲染分为两个步骤：提交阶段和渲染阶段。

提交阶段负责收集要绘制到屏幕上的所有元素，例如按钮、文本和物品。每次提交都会存入 `GuiRenderState`，由渲染阶段处理并绘制。原版提供四种元素类型：`GuiElementRenderState`、`GuiItemRenderState`、`GuiTextRenderState` 和 `PictureInPictureRenderState`。下文讨论的所有内容都发生在提交阶段，并在内部创建上述某种渲染状态。

渲染阶段会把这些元素真正绘制到屏幕上。首先，`PictureInPictureRenderState`、`GuiItemRenderState` 和 `GuiTextRenderState` 会被准备并处理为 `GuiElementRenderState`。然后对元素排序，最终绘制到屏幕。最后，`GuiRenderState` 会被重置，供下一个 GUI 或渲染 tick 使用。

### 相对坐标 {#relative-coordinates}

无论向渲染状态提交什么内容，都需要指定元素绘制位置的坐标。尽管存在多套抽象，Minecraft 的大多数渲染调用仍接收 X 和 Y 坐标。X 从左向右增加，Y 从上向下增加。不过，坐标并没有固定范围；其范围会随屏幕尺寸和游戏设置中的 GUI 缩放变化。因此必须格外小心，确保传给渲染调用的坐标能随屏幕尺寸正确缩放，也就是正确转换为相对坐标。

坐标相对化的方法见下文[屏幕][screen]一节。

:::caution
如果使用固定坐标，或者错误地缩放屏幕，绘制出的对象可能变形或位置错误。检查相对坐标是否正确的一个简单方法，是在视频设置中点击“GUI 缩放”按钮。判断 GUI 渲染缩放时，该值会作为显示器宽度和高度的除数。
:::

### `GuiGraphicsExtractor` {#guigraphicsextractor}

提交给 `GuiRenderState` 的元素通常都通过 `GuiGraphicsExtractor` 处理。提交阶段几乎所有方法的第一个参数都是 `GuiGraphicsExtractor`，它包含提交常用对象进行渲染的方法。

`GuiGraphicsExtractor` 会把当前姿态作为 `Matrix3x2fStack` 暴露出来，用于应用 XY 变换：

```java
// 假设已有某个 GuiGraphicsExtractor graphics

// 向栈中压入一个新矩阵
graphics.pose().pushMatrix();

// 应用希望元素渲染时使用的变换

// 接收 XY 偏移
graphics.pose().translate(10, 10);
// 接收弧度制旋转角度
graphics.pose().rotate((float) Math.PI);
// 接收 XY 缩放比例
graphics.pose().scale(2f, 2f);

// 向 `GuiRenderState` 提交元素
graphics.blitSprite(...);

// 弹出矩阵，重置变换
graphics.pose().popMatrix();
```

还可以通过 `enableScissor` 和 `disableScissor`，把元素裁剪到指定区域：

```java
// 假设已有某个 GuiGraphicsExtractor graphics

// 启用裁剪，并指定允许渲染的边界
graphics.enableScissor(
    // 左边界 X
    0,
    // 上边界 Y
    0,
    // 右边界 X
    10,
    // 下边界 Y
    10
);

// 向 `GuiRenderState` 提交元素
graphics.blitSprite(...);

// 禁用裁剪，恢复原来的渲染区域
graphics.disableScissor();
```

### 节点树与层级 {#node-trees-and-strata}

向 `GuiRenderState` 提交元素时，元素并不会简单加入一个列表。否则，后提交的元素可能完全覆盖先提交的元素。为解决这个问题，元素会先按层级（stratum）排序到节点树中。排序依据是元素定义的 `ScreenArea#bounds`；如果没有定义边界，元素不会提交渲染。

`GuiRenderState` 由 `GuiRenderState.Node` 组成的单向链表构成，使用 `up` 字段保存下一个元素的引用。渲染时会先绘制第一个元素，再沿 `up` 方向依次绘制。每个节点都有自己的层数据，其中包含渲染状态。元素首次提交到 `GuiRenderState` 时，会根据 `ScreenArea#bounds` 判断应使用或创建哪个节点。选中的或新建的节点位于拥有相交元素的最高节点之上。

:::warning
虽然 `ScreenArea#bounds` 标记为可空，但提交到渲染状态时如果未定义边界，元素不会被加入。该方法之所以允许 `null`，是因为渲染阶段提交的元素会直接加入当前节点，而不会根据边界计算节点。
:::

每个节点列表称为渲染状态中的一个层。调用 `GuiGraphicsExtractor#nextStratum` 可以创建新节点列表，使渲染状态拥有多个层。新层会绘制在之前所有层的元素之上，例如物品工具提示。调用 `nextStratum` 后，无法返回之前的层。

### `GuiElementRenderState` {#guielementrenderstate}

`GuiElementRenderState` 保存 GUI 元素如何绘制到屏幕的元数据。元素渲染状态继承 `ScreenArea`，用于定义屏幕上的 `bounds`。边界应始终覆盖整个要绘制的元素，以便在节点列表中正确排序。计算边界时通常使用下文某些参数，包括位置和姿态。

`scissorArea` 裁剪元素可以绘制的区域。如果 `scissorArea` 为 `null`，元素会绘制到整个屏幕；如果 `scissorArea` 与 `bounds` 没有交集，则不会绘制任何内容。

其余三个方法负责实际渲染元素。`pipeline` 定义元素使用的着色器和元数据。`textureSetup` 可以指定片段着色器中使用的 `Sampler0`、`Sampler1`、`Sampler2` 或其组合。`buildVertices` 把顶点传入要上传的缓冲区，并接收负责接收顶点的 `VertexConsumer`。

如果 `GuiGraphicsExtractor` 提供的方法不足以满足需求，NeoForge 还添加了 `GuiGraphicsExtractor#submitGuiElementRenderState`，用于提交自定义元素渲染状态。

```java
// 假设已有某个 GuiGraphicsExtractor graphics
graphics.submitGuiElementRenderState(new GuiElementRenderState() {

    // 保存栈的当前姿态
    private final Matrix3x2f pose = new Matrix3x2f(graphics.pose());
    // 保存当前裁剪区域
    @Nullable
    private final ScreenRectangle scissorArea = graphics.peekScissorStack();

    @Override
    public ScreenRectangle bounds() {
        // 假设边界为 0, 0, 10, 10
        
        // 计算初始矩形
        ScreenRectangle rectangle = new ScreenRectangle(
            // XY 位置
            0, 0,
            // 元素的宽度和高度
            10, 10
        );

        // 使用姿态把矩形变换到正确位置
        rectangle = rectangle.transformMaxBounds(this.pose);

        // 如果定义了裁剪区域，返回两个矩形的交集；
        // 否则返回完整边界
        return this.scissorArea != null
            ? this.scissorArea.intersection(rectangle)
            : rectangle;
    }

    @Override
    @Nullable
    public ScreenRectangle scissorArea() {
        return this.scissorArea;
    }

    @Override
    public RenderPipeline pipeline() {
        return RenderPipelines.GUI;
    }

    @Override
    public TextureSetup textureSetup() {
        // 返回供片段着色器中的 sampler 使用的纹理。
        // 在片段着色器中：
        // - Sampler0 通常包含元素纹理
        // - Sampler1 通常提供第二个元素纹理，目前只由末地传送门管线使用
        // - Sampler2 通常包含游戏的光照贴图纹理

        // 通常至少应为 Sampler0 指定一个纹理
        return TextureSetup.noTexture();
    }

    @Override
    public void buildVertices(VertexConsumer consumer) {
        // 使用管线指定的顶点格式构建顶点。
        // GUI 使用带位置和颜色的四边形。
        // 颜色必须为 ARGB 格式。
        consumer.addVertexWith2DPose(this.pose, 0,   0).setUv(0, 0).setColor(0xFFFFFFFF);
        consumer.addVertexWith2DPose(this.pose, 0,  10).setUv(0, 1).setColor(0xFFFFFFFF);
        consumer.addVertexWith2DPose(this.pose, 10, 10).setUv(1, 1).setColor(0xFFFFFFFF);
        consumer.addVertexWith2DPose(this.pose, 10,  0).setUv(1, 0).setColor(0xFFFFFFFF);
    }
});
```

### 元素排序 {#element-ordering}

此前介绍的元素都只在 XY 坐标上操作。GUI 渲染会忽略 Z 坐标，因为绘制到屏幕的元素都使用禁用深度测试的 `RenderPipeline`。即使使用更复杂管线的 3D 元素，默认也会通过 `RenderPipeline#GUI_TEXTURED_PREMULTIPLIED_ALPHA` 绘制到 2D 纹理，同样禁用深度测试，避免常见场景中出现 Z-fighting。

因此，在渲染阶段，各个层会依次绘制，每个节点列表从第一个元素沿 `up` 方向依次绘制。那么同一节点内部如何排序？这由 `GuiRenderer#ELEMENT_SORT_COMPARATOR` 处理，它会依次根据 `GuiElementRenderState#scissorArea`、`pipeline` 和 `textureSetup` 排序。

:::warning
文本字形不参与排序，始终会在当前节点的所有元素之后绘制。
:::

未指定 `scissorArea` 的元素总在最前，然后依次比较上边界 Y、下边界 Y、左边界 X 和右边界 X。如果两个元素的 `scissorArea` 相同，则比较 `pipeline` 的排序键，即 `RenderPipeline#getSortKey`。排序键基于 `RenderPipeline` 的构建顺序；原版中该顺序取决于 `RenderPipelines` 内静态常量的类加载顺序。如果排序键也相同，则使用 `textureSetup` 排序：未指定 `textureSetup` 的元素在前，然后按纹理元素的排序键 `TextureSetup#getSortKey` 排序。

:::warning
从技术上说，由于 `RenderPipeline` 和 `TextureSetup` 的存在，元素顺序并非确定值。排序的目标不是保证确定性，而是尽可能减少管线和纹理切换。
:::

## `GuiGraphicsExtractor` 中的方法 {#methods-in-guigraphicsextractor}

`GuiGraphicsExtractor` 包含提交常用渲染对象的方法，分为六类：彩色矩形、字符串、纹理、物品、工具提示和画中画。每个方法都会提交一个元素，并从 `pose` 继承当前姿态，从 `peekScissorStack` 继承由 `enableScissor` / `disableScissor` 设置的裁剪区域。提供给这些方法的颜色必须使用 [ARGB][argb] 格式。

### 彩色矩形 {#colored-rectangles}

彩色矩形通过 `ColoredRectangleRenderState` 提交。所有填充方法都可以接收可选的 `RenderPipeline` 和 `TextureSetup`，以指定矩形渲染方式。可以提交三种彩色矩形。

第一种是宽一个像素的水平线或竖直线，分别由 `horizontalLine` 和 `verticalLine` 提交。`horizontalLine` 接收定义左右边界（包含端点）的两个 X 坐标、上边界 Y 和颜色。`verticalLine` 接收左边界 X、定义上下边界（包含端点）的两个 Y 坐标和颜色。

第二种是 `fill` 方法，用于提交绘制到屏幕上的矩形。线条方法内部也会调用它。它接收左边界 X、上边界 Y、右边界 X、下边界 Y 和颜色。

第三种是 `outline` 方法，用四个宽一个像素的矩形组成轮廓。它接收左边界 X、上边界 Y、轮廓宽度、轮廓高度和颜色。

最后是 `fillGradient` 方法，用垂直渐变绘制矩形。它接收左边界 X、上边界 Y、右边界 X、下边界 Y，以及底部颜色和顶部颜色。

### 字符串 {#strings}

字符串、[`Component`][component] 和 `FormattedCharSequence` 通过 `GuiTextRenderState` 提交。每个字符串会使用提供的 `Font` 绘制，通过指定的 `GlyphRenderTypes#guiPipeline` 创建 `BakedGlyph.GlyphInstance`，并可选创建 `BakedGlyph.Effect`。渲染阶段，文本渲染状态会转换为 `GlyphRenderState`，字符串中的每个字符还可能产生一个 `GlyphEffectRenderState`。

字符串有两种对齐方式：左对齐文本 `text` 和居中对齐文本 `centeredText`。两者都接收渲染文本的字体、要绘制的字符串、表示字符串左边或中心位置的 X 坐标、上边界 Y 和颜色。左对齐字符串还可以额外指定是否绘制文字阴影。

如果文本需要自动换行到指定边界内，可以使用 `textWithWordWrap`。如果文本需要矩形背景，可以使用 `textWithBackdrop`。两者默认都提交左对齐字符串。

字符串也可以使用 `ActiveTextCollector` 提交。它提供带特定元数据的字符串渲染方法，例如对齐、不透明度和滚动。文本收集器可通过 `GuiGraphicsExtractor#textRenderer` 或 `textRendererForWidget` 创建，也可以继承 `ActiveTextCollector`，其构造函数通常接收 `$HoveredTextEffects`，用于设置是否渲染工具提示或改变光标等基础选项。之后可以使用 `accept` 或 `acceptScrolling` 渲染文本，传入相对于对齐位置的 X 坐标、Y 坐标、`GuiGraphicsExtractor` 的一组参数、文本本身，以及可选的文本对齐方式。`acceptScrolling` 还接收最左、最右、最上和最下位置，用于表示滚动边界。

:::note
字符串通常应以 [`Component`][component] 形式传入，因为它能处理多种使用场景，包括字符串方法的另外两个重载。
:::

### 纹理 {#textures}

纹理通过 `BlitRenderState` 提交，因此方法名为 `blit`。`BlitRenderState` 按 `RenderPipeline` 参数把图像像素复制并绘制到屏幕。每个 `blit` 还接收表示纹理绝对位置的 `Identifier`：

```java
// 指向 'assets/examplemod/textures/gui/container/example_container.png'
private static final Identifier TEXTURE = Identifier.fromNamespaceAndPath("examplemod", "textures/gui/container/example_container.png");
```

`blit` 有很多重载，这里只介绍两种。

第一种接收两个整数、两个浮点数，再接收四个整数，并假定图像位于 PNG 文件中。参数依次为屏幕上的左边界 X 和上边界 Y、PNG 内的左边界 X 和上边界 Y、绘制图像的宽高，以及 PNG 文件的宽高。

:::tip
必须指定 PNG 文件大小，才能把坐标标准化为对应的 UV 值。
:::

第二种在末尾额外接收一个整数，表示图像绘制时的着色颜色。未指定时，着色颜色为 `0xFFFFFFFF`。

#### `blitSprite` {#blitsprite}

`blitSprite` 是 `blit` 的特殊实现，纹理从 GUI 纹理图集中获取。大多数覆盖背景的纹理都是精灵，例如熔炉 GUI 中的“燃烧进度”叠加层。所有精灵纹理都相对于 `textures/gui/sprites`，且无需指定文件扩展名。

```java
// 指向 'assets/examplemod/textures/gui/sprites/container/example_container/example_sprite.png'
private static final Identifier SPRITE = Identifier.fromNamespaceAndPath("examplemod", "container/example_container/example_sprite");
```

一组 `blitSprite` 方法接收的参数与 `blit` 相同，只是省略了与 PNG 坐标、宽高相关的四个整数。

另一组 `blitSprite` 方法接收更多纹理信息，可以绘制精灵的一部分。这些方法接收精灵宽高、精灵内的 X/Y 坐标、屏幕左边界 X 和上边界 Y、着色颜色，以及要绘制图像的宽高。

如果精灵大小与纹理大小不一致，可以用三种方式缩放：`stretch`、`tile` 和 `nine_slice`。`stretch` 会把图像从纹理大小拉伸到屏幕大小。`tile` 会反复绘制纹理，直到填满屏幕大小。`nine_slice` 把纹理分为一个中心、四条边和四个角，再平铺到所需屏幕大小。

缩放方式通过在纹理文件同名的 mcmeta 文件中添加 `gui.scaling` JSON 对象来设置。

```json5
// 假设纹理文件为 example_sprite.png
// 在 example_sprite.png.mcmeta 中

// 拉伸示例
{
    "gui": {
        "scaling": {
            "type": "stretch"
        }
    }
}

// 平铺示例
{
    "gui": {
        "scaling": {
            "type": "tile",
            // 开始平铺时的尺寸
            // 通常就是纹理尺寸
            "width": 40,
            "height": 40
        }
    }
}

// 九宫格切片示例
{
    "gui": {
        "scaling": {
            "type": "nine_slice",
            // 开始平铺时的尺寸
            // 通常就是纹理尺寸
            "width": 40,
            "height": 40,
            "border": {
                // 要被切分到边框纹理中的纹理内边距
                "left": 1,
                "right": 1,
                "top": 1,
                "bottom": 1
            },
            // 为 true 时，纹理中心部分会像 stretch 类型那样拉伸，
            // 而不是进行九宫格平铺。
            "stretch_inner": true
        }
    }
}
```

:::note
使用平铺或九宫格切片纹理时，`blitSprite` 会通过 `TiledBlitRenderState` 提交元素。该渲染状态除 `BlitRenderState` 的参数外，还指定平铺宽度和高度。
:::

### 物品 {#items}

物品通过 `GuiItemRenderState` 提交。渲染阶段会根据物品边界和客户端物品属性，把该渲染状态转换为 `BlitRenderState` 或 `OversizedItemRenderState`。

`item` 接收一个 `ItemStack`，以及屏幕上的左边界 X 和上边界 Y。它还可以接收持有该物品的 `LivingEntity`、物品堆所在的 `Level` 和种子值。另有一个 `fakeItem`，会把 `LivingEntity` 设为 `null`。

耐久条、冷却和数量等物品装饰通过 `itemDecorations` 处理。它接收与基础 `item` 相同的参数，并额外接收 `Font` 和数量文本覆盖值。

### 工具提示 {#tooltips}

工具提示通过上述多种渲染状态提交。工具提示方法分为两类：“下一帧”和“立即”。两者都接收用于渲染文本的 `Font`、一组 `Component`、可选的特殊渲染 `TooltipComponent`、左边界 X 和上边界 Y、用于调整位置的 `ClientTooltipPositioner`，以及背景和边框纹理。

下一帧工具提示并不会真的等到下一帧才提交，而是把提交推迟到 `Screen#render` 调用之后。工具提示会加入新的层，因此绘制在屏幕所有元素之上。这类方法的形式为 `set*Tooltip*ForNextFrame`，还可以接收一个布尔值，表示是否覆盖当前已延迟的工具提示，以及渲染工具提示时应使用的 `ItemStack`。

立即工具提示则在调用方法时马上提交。这类方法的形式为 `tooltip`，还接收工具提示所悬停的 `ItemStack`。

### 画中画 {#picture-in-picture}

画中画（PiP）允许把任意对象绘制到屏幕上。PiP 不直接写入输出，而是先把对象绘制到中间纹理或“图片”中，然后默认在渲染阶段以 `BlitRenderState` 提交到 `GuiRenderState`。`GuiGraphicsExtractor` 提供针对地图（`map`）、实体（`entity`）、玩家皮肤（`skin`）、书模型（`book`）、旗帜图案（`bannerPattern`）、告示牌（`sign`）和性能分析图（`profilerChart`）的方法。

:::note
当 `ClientItem.Properties#oversizedInGui` 为 `true` 时，超过默认 16×16 边界的物品会使用 `OversizedItemRenderer` PiP 作为渲染机制。
:::

每个 PiP 都会提交 `PictureInPictureRenderState`，把对象绘制到屏幕。与 `GuiElementRenderState` 类似，`PictureInPictureRenderState` 也继承 `ScreenArea`，通过 `bounds` 和 `scissorArea` 定义边界与裁剪区域。它还定义图片的渲染位置和大小，即左边界 X（`x0`）、右边界 X（`x1`）、上边界 Y（`y0`）和下边界 Y（`y1`）。图片中的元素还可以按浮点数 `scale` 缩放。最后，可以使用额外的 `pose` 变换图片的 XY 坐标。默认使用单位姿态，因为渲染对象通常已在图片内部完成变换。为便于实现，可以使用 `PictureInPictureRenderState#getBounds` 计算 `bounds`；如果修改了 `pose`，则需要自行实现计算逻辑。

```java
// 可以添加其他参数，但实现所有方法至少需要这些参数
public record ExampleRenderState(
    int x0, // 左边界 X
    int x1, // 右边界 X
    int y0, // 上边界 Y
    int y1, // 下边界 Y
    float scale, // 绘制到图片时的缩放比例
    @Nullable ScreenRectangle scissorArea, // 渲染区域
    @Nullable ScreenRectangle bounds // 元素边界
) implements PictureInPictureRenderState {

    // 其他构造函数
    public ExampleRenderState(int x, int y, int width, int height, @Nullable ScreenRectangle scissorArea) {
        this(
            x, // x0
            x + width, // x1
            y, // y0
            y + height, // y1
            1f, // 缩放比例
            scissorArea,
            PictureInPictureRenderState.getBounds(x, y, x + width, y + height, scissorArea)
        );
    }
}
```

为了把对象绘制到图片并提交 PiP 渲染状态，每个 PiP 都有自己的 `PictureInPictureRenderer<T>`，其中 `T` 是实现 `PictureInPictureRenderState` 的类型。它有许多可重写方法，可以几乎完全控制整个管线，但必须实现其中三个方法。

第一个是 `getRenderStateClass`，直接返回 `PictureInPictureRenderState` 的类。在原版中，该方法用于注册渲染器所对应的渲染状态。NeoForge 仍使用渲染状态类，但改为通过事件注册，并映射到动态渲染器池，而不再调用 `getRenderStateClass`。

第二个是 `getTextureLabel`，为正在写入的图片提供唯一调试标签。最后是 `renderToTexture`，实际把对象绘制到图片中，类似其他渲染方法。

```java
public class ExampleRenderer extends PictureInPictureRenderer<ExampleRenderState> {

    // 接收把对象写入图片时使用的缓冲区
    public ExampleRenderer(MultiBufferSource.BufferSource bufferSource) {
        super(bufferSource);
    }

    @Override
    public Class<ExampleRenderState> getRenderStateClass() {
        // 返回渲染状态类
        return ExampleRenderState.class;
    }

    @Override
    protected String getTextureLabel() {
        // 可以是任意字符串，但应当唯一
        // 加上模组 ID 前缀会更清楚
        return "examplemod: example pip";
    }

    @Override
    protected void renderToTexture(ExampleRenderState renderState, PoseStack pose) {
        // 如有需要，可以修改姿态
        // 可以压入和弹出姿态，但写入图片时会创建新的 `PoseStack`
        pose.translate(...);

        // 把对象渲染到屏幕
        VertexConsumer consumer = this.bufferSource.getBuffer(RenderType.lines());
        consumer.addVertex(...).setColor(...).setNormal(...);
        consumer.addVertex(...).setColor(...).setNormal(...);
    }

    // 其他方法

    @Override
    protected void blitTexture(ExampleRenderState renderState, GuiRenderState guiState) {
        // 默认把图片作为 `BlitRenderState` 提交到 GUI 渲染状态
        // 如需修改 `BlitRenderState`，可重写此方法
        // 应调用 `GuiRenderState#submitBlitToCurrentLayer`
        // 边界可以为 `null`
        super.blitTexture(renderState, guiState);
    }

    @Override
    protected boolean textureIsReadyToBlit(ExampleRenderState renderState) {
        // 为 true 时，会复用已经写入的图片，
        // 而不是创建新图片并通过 `renderToTexture` 写入。
        // 只有能保证两个元素会*完全相同*地渲染时，才应返回 true。
        return super.textureIsReadyToBlit(renderState);
    }

    @Override
    protected float getTranslateY(int scaledHeight, int guiScale) {
        // 设置 `PoseStack` 在 Y 方向上的初始平移。
        // 常见实现使用 `scaledHeight / 2f`，像 X 方向一样居中 Y 坐标。
        return scaledHeight;
    }

    @Override
    public boolean canBeReusedFor(ExampleRenderState state, int textureWidth, int textureHeight) {
        // NeoForge 添加的方法，用于检查渲染器能否在后续帧中复用。
        // 为 true 时会复用上一帧构建的状态和渲染器；
        // 为 false 时会创建新渲染器。
        return super.canBeReusedFor(state, textureWidth, textureHeight);
    }
}
```

要使用 PiP，必须在[模组事件总线][modbus]上的 `RegisterPictureInPictureRenderersEvent` 中注册渲染器：

```java
@SubscribeEvent // 在模组事件总线上
public static void registerPip(RegisterPictureInPictureRenderersEvent event) {
    event.register(
        // PiP 渲染状态类
        ExampleRenderState.class,
        // 接收 `MultiBufferSource.BufferSource` 并返回 PiP 渲染器的工厂
        ExampleRenderer::new
    );
}
```

之后可以通过 NeoForge 添加的 `GuiGraphicsExtractor#submitPictureInPictureRenderState` 提交 PiP 渲染状态：

```java
// 假设已有某个 GuiGraphicsExtractor graphics
graphics.submitPictureInPictureRenderState(new ExampleRenderState(
    0, 0,
    10, 10,
    // 从栈中取得裁剪区域
    graphics.peekScissorStack()
));
```

:::note
NeoForge 修复了一个 Bug，使同一帧内可以提交多个相同 PiP 渲染状态实例。
:::

## `Renderable` {#renderable}

`Renderable` 本质上是可渲染对象，包括屏幕、按钮、聊天框、列表等。`Renderable` 只有一个方法 `#extractRenderState`，接收用于向屏幕提交元素的 `GuiGraphicsExtractor`、按相对屏幕尺寸缩放后的鼠标 X/Y 坐标，以及 tick 增量，即距离上一帧过了多少 tick。

常见可渲染对象包括屏幕和“控件”，例如可交互的 `Button`、其子类 `ImageButton`，以及用于在屏幕上输入文本的 `EditBox`。

## `GuiEventListener` {#guieventlistener}

Minecraft 中所有屏幕都实现 `GuiEventListener`。`GuiEventListener` 负责处理用户与屏幕的交互，包括鼠标输入（移动、点击、释放、拖动、滚轮、悬停）和键盘输入（按下、释放、输入字符）。每个方法返回对应操作是否成功影响了屏幕。按钮、聊天框、列表等控件也实现该接口。

### `ContainerEventHandler` {#containereventhandler}

与 `GuiEventListener` 密切相关的子类型是 `ContainerEventHandler`。它负责处理包含控件的屏幕上的用户交互，管理当前获得焦点的控件，以及如何应用相关交互。`ContainerEventHandler` 额外提供三项功能：可交互子元素、拖动和焦点。

事件处理器持有子元素，用于确定元素交互顺序。在鼠标事件处理器中（拖动除外），鼠标悬停到的第一个子元素会执行其逻辑。

通过 `#mouseClicked` 和 `#mouseReleased` 实现的鼠标拖动，会提供更精确的执行逻辑。

焦点机制允许优先检查并处理某个子元素，例如键盘事件或鼠标拖动期间。通常通过 `#setFocused` 设置焦点。此外，还可以使用 `#nextFocusPath` 循环切换可交互子元素，根据传入的 `FocusNavigationEvent` 选择子元素。

:::note
屏幕通过 `AbstractContainerEventHandler` 实现 `ContainerEventHandler`，后者添加了拖动和焦点的设置与读取逻辑。
:::

## `NarratableEntry` {#narratableentry}

`NarratableEntry` 是可以通过 Minecraft 无障碍叙述功能朗读的元素。每个元素会根据悬停或选中的内容提供不同叙述，优先级通常为焦点、悬停，然后其他情况。

`NarratableEntry` 有四个方法：两个决定元素朗读时的优先级（`#narrationPriority` 和 `#getTabOrderGroup`）；一个决定是否朗读（`#isActive`）；最后一个把叙述内容提供给对应的语音或文本输出（`#updateNarration`）。

:::note
Minecraft 中所有控件都是 `NarratableEntry`，因此使用现成的子类型时通常不需要手动实现。
:::

## 屏幕子类型 {#the-screen-subtype}

掌握以上内容后，就可以构造基础屏幕。为便于理解，下面按通常遇到的顺序介绍屏幕组件。

首先，所有屏幕都接收表示标题的 `Component`。该组件通常由某个屏幕子类绘制到屏幕上；在基础屏幕中，它只用于生成叙述消息。屏幕还可以接收 `Minecraft` 实例和渲染文本所用的 `Font`；未指定时会使用默认实例和字体。

```java
// 在某个 Screen 子类中
public MyScreen(Component title) {
    super(Minecraft.getInstance(), Minecraft.getInstance().font, title);
}
```

### 初始化 {#initialization}

屏幕初始化后会调用 `#init` 方法。`init` 会从 `Minecraft` 实例取得初始设置，并按游戏缩放后的相对宽度和高度设置屏幕。添加控件、预先计算相对坐标等准备工作都应在此完成。如果游戏窗口大小改变，游戏会再次调用 `init` 重新初始化屏幕。

向屏幕添加控件有三种方式，用途各不相同：

| 方法 | 说明 |
|:----:|------|
| `addWidget` | 添加可交互、可叙述，但不渲染的控件。 |
| `addRenderableOnly` | 添加只渲染、不可交互也不可叙述的控件。 |
| `addRenderableWidget` | 添加可交互、可叙述且会渲染的控件。 |

通常最常使用 `addRenderableWidget`。

```java
// 在某个 Screen 子类中
@Override
protected void init() {
    super.init();

    // 添加控件和预先计算的值
    this.addRenderableWidget(new EditBox(/* ... */));
}
```

### 屏幕 tick {#ticking-screens}

屏幕还会用 `#tick` 方法执行 tick，完成一些为渲染服务的客户端逻辑。

```java
// 在某个 Screen 子类中
@Override
public void tick() {
    super.tick();

    // 每帧执行一些逻辑
}
```

### 输入处理 {#input-handling}

由于屏幕是 `GuiEventListener` 的子类型，也可以重写输入处理器，例如处理特定[按键][keymapping]的逻辑。

### 渲染屏幕 {#rendering-the-screen}

屏幕通过 `#extractRenderStateWithTooltipAndSubtitles` 在三个层中提交元素：背景层、元素层和可选的悬停层。

背景层元素首先通过 `#extractBackground` 提交，通常包含模糊效果或背景纹理。

:::warning
通过 `GuiGraphicsExtractor#blurBeforeThisStratum` 处理的模糊效果，在任意一帧中只能调用一次。尝试提交第二次模糊会抛出异常。
:::

元素层元素随后通过 `Renderable` 子类型提供的 `#extractRenderState` 方法提交，主要提交控件和标签，并设置要提交的悬停元素。

最后，悬停层提交覆盖在之前元素之上的内容，例如工具提示。

```java
// 在某个 Screen 子类中

// mouseX 和 mouseY 表示鼠标在屏幕上缩放后的坐标
@Override
public void extractBackground(GuiGraphicsExtractor graphics, int mouseX, int mouseY, float partialTick) {
    // 在背景层提交内容
    this.extractTransparentBackground(graphics);
}

@Override
public void extractRenderState(GuiGraphicsExtractor graphics, int mouseX, int mouseY, float partialTick) {
    // 在控件之前提交内容

    // 然后提交控件（如果它们是 Screen 的直接子元素）
    super.extractRenderState(graphics, mouseX, mouseY, partialTick);

    // 在控件之后提交内容

    // 设置要在此方法所有内容上方添加的工具提示
    graphics.setTooltipForNextFrame(...);
}
```

### 关闭屏幕 {#closing-the-screen}

屏幕关闭时，由 `#onClose` 和 `#removed` 两个方法处理清理工作。

用户输入关闭当前屏幕时会调用 `onClose`。该方法通常用于销毁并保存屏幕内部进程，例如向服务端发送数据包。

`removed` 会在屏幕即将更换并被垃圾回收前调用，用于处理屏幕打开前尚未恢复到初始状态的内容。

```java
// 在某个 Screen 子类中

@Override
public void onClose() {
    // 在这里停止处理器

    // 最后调用，以免干扰重写逻辑
    super.onClose();
}

@Override
public void removed() {
    // 在这里重置初始状态

    // 最后调用，以免干扰重写逻辑
    super.removed()
;}
```

## `AbstractContainerScreen` {#abstractcontainerscreen}

如果屏幕直接关联[菜单][menus]，应改为继承 `AbstractContainerScreen`。它同时充当菜单的屏幕和输入处理器，并包含槽位同步与交互逻辑。因此，通常只需重写或实现两个方法，就能得到可用的容器屏幕。下面仍按通常遇到的顺序介绍容器屏幕组件。

`AbstractContainerScreen` 通常需要五个参数：要打开的容器菜单（由泛型 `T` 表示）、玩家物品栏（仅用于显示名称）、屏幕标题，以及背景纹理的宽度和高度。

:::note
如果背景纹理宽高为 176 × 166，可以从父类构造函数中省略。这里不是指图像文件大小（通常为 256 × 256 的 PNG），而是其中实际使用的纹理边界。
:::

容器屏幕中可以设置以下定位字段：

| 字段 | 说明 |
|:----:|------|
| `titleLabelX` | 屏幕标题渲染位置的相对 X 坐标。 |
| `titleLabelY` | 屏幕标题渲染位置的相对 Y 坐标。 |
| `inventoryLabelX` | 玩家物品栏名称渲染位置的相对 X 坐标。 |
| `inventoryLabelY` | 玩家物品栏名称渲染位置的相对 Y 坐标。 |

:::caution
前文提到，预先计算的相对坐标应在 `#init` 中设置。这里仍然如此；下面这些值不是预先计算的坐标，而是静态值和相对化后的坐标。

图像宽高是静态且不变的，因为它们表示背景纹理大小。为便于渲染，`init` 方法还会预计算 `leftPos` 和 `topPos`，标记背景将渲染的左上角。标签坐标相对于这两个值。

`leftPos` 和 `topPos` 也便于绘制背景，因为它们已经可以直接传给 `GuiGraphicsExtractor#blit`。
:::

```java
// 在某个 AbstractContainerScreen 子类中
public MyContainerScreen(MyMenu menu, Inventory playerInventory, Component title) {
    super(menu, playerInventory, title, 176, 166);

    this.titleLabelX = 10;
    this.inventoryLabelX = 10;
}
```

### 访问菜单 {#menu-access}

由于菜单传入了屏幕，任何原来位于菜单中并已同步的值（无论通过槽位、数据槽还是自定义系统）都可以通过 `menu` 字段访问。

### 容器 tick {#container-tick}

玩家存活并正在查看屏幕时，容器屏幕会在 `#tick` 中通过 `#containerTick` 执行 tick。它实际上取代了容器屏幕中的 `tick`，最常见的用途是更新配方书。

```java
// 在某个 AbstractContainerScreen 子类中
@Override
protected void containerTick() {
    super.containerTick();

    // 在这里更新内容
}
```

### 渲染容器屏幕 {#rendering-the-container-screen}

容器屏幕会使用全部三个层提交元素。首先，背景层通过重写 `#extractBackground` 提交背景纹理。然后，元素层在 `#extractContents` 中像之前一样提交控件，再在 `#extractLabels` 中提交标签。最后，`AbstractContainerScreen` 通过 `extractTooltip` 准备好要在悬停层提交的工具提示。

先从背景开始，调用 `extractBackground` 把屏幕背景元素提交到背景层。

```java
// 在某个 AbstractContainerScreen 子类中

// 背景纹理位置（assets/<namespace>/<path>）
private static final Identifier BACKGROUND_LOCATION = Identifier.fromNamespaceAndPath(MOD_ID, "textures/gui/container/my_container_screen.png");

@Override
protected void extractBackground(GuiGraphicsExtractor graphics, int mouseX, int mouseY, float partialTick) {
    super.extractBackground(graphics, mouseX, mouseY, a);

    // 提交背景纹理。'leftPos' 和 'topPos' 已经表示
    // 纹理应渲染的左上角，因为它们由 'imageWidth'
    // 和 'imageHeight' 预先计算而来。两个 0 表示
    // PNG 文件内部的整数 u/v 坐标，文件大小由
    // 最后两个整数表示（通常为 256 × 256）。
    graphics.blit(
        RenderPipelines.GUI_TEXTURED,
        BACKGROUND_LOCATION,
        this.leftPos, this.topPos,
        0, 0,
        this.imageWidth, this.imageHeight,
        256, 256
    );
}
```

控件之后会调用 `extractLabels`，在渲染层提交文本。它使用屏幕字体调用 `text`，提交相关组件。

```java
// 在某个 AbstractContainerScreen 子类中
@Override
protected void extractLabels(GuiGraphicsExtractor graphics, int mouseX, int mouseY) {
    super.extractLabels(graphics, mouseX, mouseY);

    // 假设已有某个 Component 'label'
    // 'label' 绘制在 'labelX' 和 'labelY'
    // 颜色是 ARGB 值
    // 最后一个布尔值为 true 时绘制文字阴影
    graphics.text(this.font, this.label, this.labelX, this.labelY, 0xFF404040, false);
}
```

:::note
提交标签时**不需要**指定 `leftPos` 和 `topPos` 偏移。它们已经在 `Matrix3x2fStack` 中完成平移，因此该方法内提交的所有内容都相对于这些坐标。
:::

## 注册 `AbstractContainerScreen` {#registering-an-abstractcontainerscreen}

要让菜单使用 `AbstractContainerScreen`，必须注册屏幕。可以在[**模组事件总线**][modbus]上的 `RegisterMenuScreensEvent` 中调用 `register`：

```java
@SubscribeEvent // 仅在物理客户端上于模组事件总线触发
public static void registerScreens(RegisterMenuScreensEvent event) {
    event.register(MY_MENU.get(), MyContainerScreen::new);
}
```

[menus]: ../inventories/menus.md
[network]: ../networking/index.md
[screen]: #the-screen-subtype
[argb]: https://en.wikipedia.org/wiki/RGBA_color_model#ARGB32
[component]: ../resources/client/i18n.md#components
[keymapping]: ../../26.1/misc/keymappings.md#inside-a-gui
[modbus]: ../concepts/events.md#event-buses
