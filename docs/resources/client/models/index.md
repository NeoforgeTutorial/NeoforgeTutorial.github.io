# 模型

模型是决定方块或物品视觉形状和纹理的 JSON 文件。模型由长方体元素组成，每个元素都有自己的尺寸，随后为每个面指定纹理。

物品使用其[客户端物品][citems]定义的关联模型，方块使用[方块状态文件][bsfile]中的关联模型。这些位置相对于 `models` 目录，因此名称 `examplemod:item/example_model` 引用的模型定义在 `assets/examplemod/models/item/example_model.json`。

## 规范

_另见 [Minecraft Wiki][mcwiki] 上的[模型][mcwikimodel]。_

模型是 JSON 文件，根标签可包含以下可选属性：

- `loader`：NeoForge 添加。设置自定义模型加载器，更多信息见[模型加载器][custommodelloader]。
- `parent`：设置父模型，形式为相对于 `models` 文件夹的[资源位置][rl]。所有父模型属性都会应用，然后被声明它们的模型中的属性覆盖。常见父模型包括：
    - `minecraft:block/block`：所有方块模型的通用父模型。
    - `minecraft:block/cube`：所有使用 1x1x1 立方体模型的父模型。
    - `minecraft:block/cube_all`：六面使用同一纹理的立方体模型变体，例如圆石或木板。
    - `minecraft:block/cube_bottom_top`：四个侧面使用同一纹理，顶部和底部使用不同纹理的立方体模型变体。常见例子包括砂岩或雕纹石英块。
    - `minecraft:block/cube_column`：具有侧面纹理以及顶部和底部纹理的立方体模型变体。例如原木、石英柱和紫珀柱。
    - `minecraft:block/cross`：使用两个带相同纹理的平面，一个顺时针旋转 45°，另一个逆时针旋转 45°，从上方看形成 X（因此得名）。例如大多数植物，如草、树苗和花。
    - `minecraft:item/generated`：经典 2D 平面物品模型的父模型。游戏中大多数物品使用它。由于四边形由纹理生成，它会忽略 `elements` 块。
    - `minecraft:item/handheld`：用于看起来被玩家实际握持的 2D 平面物品模型，主要用于工具。它是 `item/generated` 的子模型，因此也会忽略 `elements` 块。
    - 方块物品通常（但并非总是）为[物品模型][itemmodels]使用对应方块模型。例如圆石的客户端物品使用 `minecraft:block/cobblestone` 模型。
- `ambientocclusion`：是否启用[环境光遮蔽][ao]。仅对方块模型有效，默认 `true`。如果自定义方块模型的明暗异常，可尝试设为 `false`。
- `gui_light`：可为 `"front"` 或 `"side"`。`"front"` 表示光从正面照来，适合平面 2D 模型；`"side"` 表示光从侧面照来，适合 3D 模型（尤其是方块模型）。默认 `"side"`，仅对物品模型有效。
- `textures`：子对象，把名称（材质变量）映射到 `Material`。材质变量随后可用于[元素]。它们也可以在元素中指定，但可先留空，由子模型指定。
    - `sprite`：[纹理位置][textures]。
    - `force_translucent`：为 `true` 时，强制应用此纹理的面在 `translucent` 层渲染。为 `false` 时：
        - 纹理只有不透明像素（alpha 为 `255`）时，该面在 `solid` 层渲染。
        - 纹理像素要么不透明，要么完全透明（alpha 为 `0` 或 `255`）时，该面在 `cutout` 层渲染。
        - 其他情况下，该面在 `translucent` 层渲染。

:::tip
方块模型还应指定 `particle` 纹理。玩家落到方块上、跑过方块或破坏方块时会使用该纹理。

物品模型也可以使用分层纹理，名称为 `layer0`、`layer1` 等；索引较大的层会渲染在索引较小的层上方（例如 `layer1` 渲染在 `layer0` 上方）。仅当父模型为 `item/generated` 时有效，且最多支持 5 层（`layer0` 到 `layer4`）。
:::

- `elements`：长方体[元素]列表。
- `display`：保存不同[视角]显示选项的子对象，可用键见链接文章。仅对物品模型有效，但通常也会写在方块模型中，让物品模型继承显示选项。每个视角都是可选子对象，可包含以下选项，按顺序应用：
    - `translation`：模型平移，形式为 `[x, y, z]`。
    - `rotation`：模型旋转，形式为 `[x, y, z]`。
    - `scale`：模型缩放，形式为 `[x, y, z]`。
    - `right_rotation`：NeoForge 添加。在缩放后应用的第二次旋转，形式为 `[x, y, z]`。
- `transform`：见[根变换][roottransforms]。

:::tip
如果无法确定某个属性该如何指定，可以查看执行类似功能原版模型。
:::

### 元素 {#elements}

元素是长方体的 JSON 表示，具有以下属性：

- `from`：长方体起始角坐标，形式为 `[x, y, z]`，单位为 1/16 方块。例如 `[0, 0, 0]` 是“左下角”，`[8, 8, 8]` 是中心，`[16, 16, 16]` 是方块“右上角”。
- `to`：长方体结束角坐标，形式为 `[x, y, z]`。与 `from` 一样，单位为 1/16 方块。

:::tip
Minecraft 把 `from` 和 `to` 限制在 `[-16, 32]` 范围内。不过强烈不建议超出 `[0, 16]`，否则会导致光照和/或剔除问题。
:::

- `neoforge_data`：见[额外面数据][extrafacedata]。
- `faces`：最多包含 6 个面数据的对象，名称分别为 `north`、`south`、`east`、`west`、`up` 和 `down`。每个面具有以下数据：
    - `uv`：面的 UV，形式为 `[u1, v1, u2, v2]`，其中 `u1, v1` 是左上 UV 坐标，`u2, v2` 是右下 UV 坐标。
    - `texture`：该面使用的纹理，必须是带 `#` 前缀的纹理变量。例如模型有名为 `wood` 的纹理时，使用 `#wood` 引用它。技术上可选，缺失时使用 missing texture。
    - `rotation`：可选。把纹理顺时针旋转 90、180 或 270 度。
    - `cullface`：可选。告诉渲染引擎：当指定方向有完整方块贴邻时，跳过该面。方向可为 `north`、`south`、`east`、`west`、`up` 或 `down`。
    - `tintindex`：可选。指定颜色处理器可用的着色索引，更多信息见[着色][tinting]。默认 -1，表示不着色。
    - `neoforge_data`：见[额外面数据][extrafacedata]。

此外还可指定以下可选属性：

- `shade`：仅用于方块模型。可选。元素各面是否根据方向进行明暗处理，默认 true。
- `rotation`：对象旋转，形式为包含以下数据的子对象：
    - `angle`：旋转角度，单位为度。
    - `axis`：旋转轴。目前无法绕多个轴旋转对象。
    - `origin`：可选。旋转原点，形式为 `[x, y, z]`。注意这些是绝对坐标，不相对于立方体位置；未指定时使用 `[0, 0, 0]`。

#### 额外面数据 {#extra-face-data}

额外面数据（`neoforge_data`）可应用于元素以及元素的单个面。在所有可用上下文中都是可选的。如果同时指定元素级和面级额外面数据，面级数据会覆盖元素级数据。额外数据可包含：

- `color`：用给定颜色为面着色。必须是 ARGB 值，可写成字符串或十进制整数（JSON 不支持十六进制字面量），默认 `0xFFFFFFFF`。颜色值恒定时可用来替代着色。
- `block_light`：覆盖该面使用的方块光值，默认 0。
- `sky_light`：覆盖该面使用的天空光值，默认 0。
- `ambient_occlusion`：启用或禁用该面的环境光遮蔽，默认采用模型中设置的值。

### 根变换 {#root-transforms}

在模型顶层添加 `transform` 属性，会告诉加载器：应在应用[方块状态文件][bsfile]中的旋转（方块模型）或 `display` 块中的变换（物品模型）之前，立即对所有几何体应用一次变换。该功能由 NeoForge 添加。

根变换有两种指定方式。第一种是单个名为 `matrix` 的属性，包含以嵌套 JSON 数组表示的 3x4 变换矩阵（行主序，省略最后一行）。矩阵依次由平移、左旋转、缩放、右旋转和变换原点组合而成。例如：

```json5
{
    // ...
    "transform": {
        "matrix": [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ]
    }
}
```

第二种方式是指定 JSON 对象，可包含以下任意组合，并按顺序应用：

- `translation`：相对平移，指定为三维向量（`[x, y, z]`），缺失时默认 `[0, 0, 0]`。
- `rotation` 或 `left_rotation`：在缩放前绕平移后原点应用的旋转，默认无旋转。指定方式如下：
    - 只包含一个轴到旋转映射的 JSON 对象，例如 `{"x": 90}`。
    - 数组，每项都是只包含一个轴旋转映射的 JSON 对象，按指定顺序应用，例如 `[{"x": 90}, {"y": 45}, {"x": -22.5}]`。
    - 包含三个值的数组，分别指定绕各轴的旋转，例如 `[90, 45, -22.5]`。
    - 包含四个值并直接指定四元数的数组，例如 `[0.38268346, 0, 0, 0.9238795]`（绕 X 轴 45 度）。
- `scale`：相对于平移后原点的缩放，指定为三维向量（`[x, y, z]`），缺失时默认 `[1, 1, 1]`。
- `post_rotation` 或 `right_rotation`：在缩放后绕平移后原点应用的旋转，默认无旋转，指定方式同 `rotation`。
- `origin`：旋转和缩放使用的原点，变换最后也会移到这里。可指定为三维向量（`[x, y, z]`），或使用内置值 `"corner"`（= `[0, 0, 0]`）、`"center"`（= `[0.5, 0.5, 0.5]`）和 `"opposing-corner"`（= `[1, 1, 1]`，默认）。

## 方块状态文件 {#blockstate-files}

_另见 [Minecraft Wiki][mcwiki] 上的[方块状态文件][mcwikiblockstate]。_

方块状态文件用于给不同[方块状态]分配不同模型。每个注册到游戏中的方块必须恰好有一个方块状态文件。方块状态可通过三种互斥方式指定方块模型：变体、multipart 或 NeoForge 添加的定义类型。

在 `variants` 块中，每个方块状态对应一个元素。这是把方块状态关联到模型的主要方式，绝大多数方块都使用它。
- 键是不含方块名称的方块状态字符串表示，例如未含水上半砖使用 `"type=top,waterlogged=false"`，无属性方块使用 `""`。不受使用的属性可以省略。例如 `waterlogged` 不影响模型选择时，`type=top,waterlogged=false` 和 `type=top,waterlogged=true` 可以合并成一个 `type=top`。这也意味着空字符串对每个方块都有效。
- 值可以是单个模型对象或模型对象数组。使用数组时会随机选择模型。模型对象包含：
    - `type`：NeoForge 添加，设置自定义方块状态模型加载器，见[方块状态模型加载器][bsmmodelloader]。
    - `model`：相对于命名空间 `models` 文件夹的模型文件路径，例如 `minecraft:block/cobblestone`。
    - `x` 和 `y`：模型绕 x 轴/y 轴的旋转，限制为 90 度步长。两者均可选，默认 0。
    - `uvlock`：旋转时是否锁定模型 UV。可选，默认 false。
    - `weight`：仅对模型对象数组有意义。为对象指定权重，用于随机选择。可选，默认 1。

相反，在 `multipart` 块中，元素会根据方块状态属性组合。这种方式主要用于栅栏和墙，它们根据布尔属性启用四个方向部件。multipart 元素由 `when` 块和 `apply` 块组成。

- `when` 块指定方块状态字符串，或元素生效所需满足的属性列表。列表可命名为 `"OR"` 或 `"AND"`，对内容执行相应逻辑运算。单个方块状态和列表值还可用 `|` 分隔多个实际值（例如 `facing=east|facing=west`）。
- `apply` 块指定使用的一个模型对象或模型对象数组，工作方式与 `variants` 块完全相同。

最后，`neoforge:definition_type` 可指定自定义模型加载器来注册方块状态文件，见[方块状态定义加载器][bsdmodelloader]。

## 客户端物品

游戏使用[客户端物品][citems]为 `ItemStack` 的不同状态分配一个或多个模型。虽然模型 JSON 中有一些物品专用字段，但客户端物品会根据上下文使用模型进行渲染，因此其大部分信息已移至独立的[章节][citems]。

## 着色 {#tinting}

草和树叶等方块会根据位置和/或属性改变纹理颜色。[模型元素][elements]可在面上指定着色索引，让颜色处理器处理相应面。代码侧通过三个事件工作：方块着色源、基于生物群系的方块着色（与方块着色源配合使用）以及物品着色源。先看方块着色源示例：

```java
@SubscribeEvent // 仅在物理客户端的模组事件总线上
public static void registerBlockColorHandlers(RegisterColorHandlersEvent.BlockTintSources event) {
    // 参数为方块状态、方块所在关卡、方块位置和着色索引。
    // 关卡和位置可以为 null。
    event.register(
        // 要应用到方块的着色源列表。模型中的 'tintindex'
        // 用作该列表的索引。
        List.of(
            // 对应 'tintindex: 0'。
            // 接收方块状态。
            state -> {
                // 替换为你自己的计算。原版参考见 BlockColors 类。
                // 颜色为 ARGB 格式。
                return 0xFFFFFFFF;
            },
            // 对应 'tintindex: 1'，
            new BlockTintSource() {

                @Override
                public int color(BlockState state) {
                    // 应用的默认颜色。
                    return 0xFFFFFFFF;
                }

                @Override
                public int colorInWorld(BlockState state, BlockAndTintGetter level, BlockPos pos) {
                    // 方块在世界中时应用的颜色。
                    // 未重写时默认使用 `color`。
                    return 0xFFFFFFFF;
                }

                @Override
                public int colorAsTerrainParticle(BlockState state, BlockAndTintGetter level, BlockPos pos) {
                    // 生成 `TerrainParticle` 时应用的颜色。
                    // 未重写时默认使用 `colorInWorld`。
                    return 0xFFFFFFFF;
                }
            }
        ),
        // 要应用色彩处理的方块可变参数
        EXAMPLE_BLOCK.get(), ...
    );
}
```

下面是颜色解析器示例：

```java
@SubscribeEvent // 仅在物理客户端的模组事件总线上
public static void registerColorResolvers(RegisterColorHandlersEvent.ColorResolvers event) {
    // 参数为当前生物群系、方块的 X 坐标和 Z 坐标。
    event.register((biome, x, z) -> {
        // 替换为你自己的计算。原版参考见 BiomeColors 类。
        // 颜色为 ARGB 格式。
        return 0xFFFFFFFF;
    });
}
```

物品着色请参阅[客户端物品文章中相关章节][itemtints]。

## 注册独立模型

某些模型不以任何方式关联到方块或物品，但仍在其他上下文（例如[方块实体渲染器][ber]）中需要，可通过 `ModelEvent.RegisterStandalone` 注册：

```java
// 可以是任意类型，只要能够从 ResolvedModel 和 ModelBaker 取得
// 泛型类型应与 UnbakedStandaloneModel<T> 的泛型类型一致
public static final StandaloneModelKey<QuadCollection> EXAMPLE_KEY = new StandaloneModelKey<>(
    new ModelDebugName() {
        @Override
        public String debugName() {
            // 独立模型的名称
            // 可以是任意字符串，但应包含模组 ID
            return "examplemod: Example Model";
        }
    }
);



@SubscribeEvent // 仅在物理客户端的模组事件总线上
public static void registerAdditional(ModelEvent.RegisterStandalone event) {
    event.register(
        // 要取得的模型
        EXAMPLE_KEY,
        // 我们关心的 UnbakedStandaloneModel<T>，这里返回 QuadCollection
        // 可简单使用 SimpleUnbakedStandaloneModel<T> 的静态方法
        SimpleUnbakedStandaloneModel.quadCollection(
            // 模型 ID，相对于 `assets/<namespace>/models/<path>.json`
            Identifier.fromNamespaceAndPath("examplemod", "block/example_unused_model")
        )
    );
}
```

[ao]: https://en.wikipedia.org/wiki/Ambient_occlusion
[ber]: ../../../blockentities/ber.md
[bsfile]: #blockstate-files
[bsdmodelloader]: modelloaders.md#block-state-definition-loaders
[bsmmodelloader]: modelloaders.md#block-state-model-loaders
[custommodelloader]: modelloaders.md#model-loaders
[elements]: #elements
[event]: ../../../concepts/events.md
[extrafacedata]: #extra-face-data
[citems]: items.md
[itemmodel]: items.md#a-basic-model
[itemtints]: items.md#tinting
[mcwiki]: https://minecraft.wiki
[mcwikiblockstate]: https://minecraft.wiki/w/Tutorials/Models#Block_states
[mcwikimodel]: https://minecraft.wiki/w/Model
[mipmapping]: https://en.wikipedia.org/wiki/Mipmap
[modbus]: ../../../concepts/events.md#event-buses
[perspectives]: modelsystem.md#perspectives
[rendertype]: #render-types
[roottransforms]: #root-transforms
[rl]: ../../../misc/identifier.md
[textures]: ../textures.md
[tinting]: #tinting
