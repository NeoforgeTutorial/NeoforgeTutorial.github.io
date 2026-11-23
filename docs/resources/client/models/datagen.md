# 模型数据生成

与大多数 JSON 数据一样，方块和物品模型及其所需方块状态文件和[客户端物品][citems]都可以[数据生成][datagen]。这些都由原版 `ModelProvider` 处理，NeoForge 通过 `ExtendedModelTemplateBuilder` 提供扩展。由于方块模型和物品模型的 JSON 本身相近，它们的数据生成代码也较为相似。

## 模型模板

每个模型都从 `ModelTemplate` 开始。在原版中，`ModelTemplate` 指向某个预生成模型文件的父模型，定义父模型、必需纹理槽和文件后缀。NeoForge 则通过 `ExtendedModelTemplateBuilder` 构造 `ExtendedModelTemplate`，可生成到基础元素和面，并使用所有 NeoForge 添加的功能。

可以通过 `ModelTemplates` 中的方法或调用构造方法创建 `ModelTemplate`。构造方法接收：可选的父模型 `Identifier`（相对于 `models` 目录）、可选的文件路径末尾字符串（例如按钮按下时使用 `_pressed` 后缀），以及一组必需 `TextureSlot`，数据生成缺少这些槽时会崩溃。`TextureSlot` 只是定义 `textures` 映射中纹理“键”的字符串。每个键还可指定父 `TextureSlot`，当前槽未指定纹理时回退到父槽。例如 `TextureSlot#PARTICLE` 会先查找 `particle` 纹理，再查找 `texture`，最后查找 `all`。如果该槽及其父槽都未定义，数据生成期间会崩溃。

```java
// 假设有以 '#base' 引用的纹理
// 可通过指定 'base' 或 'all' 解析
public static final TextureSlot BASE = TextureSlot.create("base", TextureSlot.ALL);

// 假设存在模型 'examplemod:block/example_template'
public static final ModelTemplate EXAMPLE_TEMPLATE = new ModelTemplate(
    // 父模型位置
    Optional.of(
        ModelLocationUtils.decorateBlockModelLocation("examplemod:example_template")
    ),
    // 应用到使用此模板的所有模型路径末尾的后缀
    Optional.of("_example"),
    // 所有必须定义的纹理槽
    // 应根据父模型中未定义的内容尽量具体
    TextureSlot.PARTICLE,
    BASE
);
```

NeoForge 添加的 `ExtendedModelTemplate` 可通过 `ExtendedModelTemplateBuilder#builder` 构造，也可对现有原版模板调用 `ModelTemplate#extend`。随后用 `#build` 把构建器解析为模板。构建器方法可完全控制模型 JSON 的构造：

| 方法                                                                    | 作用|
|-------------------------------------------------------------------------|-----|
| `#parent(Identifier parent)`                                             | 设置相对于 `models` 目录的父模型位置。|
| `#suffix(String suffix)`                                                 | 把字符串追加到模型文件路径末尾。|
| `#requiredTextureSlot(TextureSlot slot)`                                 | 添加数据生成时必须在 `TextureMapping` 中定义的纹理槽。|
| `transform(ItemDisplayContext type, Consumer<TransformVecBuilder> action)` | 添加由 consumer 配置的 `TransformVecBuilder`，用于设置模型 `display`。|
| `#ambientOcclusion(boolean ambientOcclusion)`                           | 设置是否使用[环境光遮蔽][ao]。|
| `#guiLight(UnbakedModel.GuiLight light)`                                 | 设置 GUI 光照，可为 `GuiLight.FRONT` 或 `GuiLight.SIDE`。|
| `#element(Consumer<ElementBuilder> action)`                              | 添加由 consumer 配置的新 `ElementBuilder`，相当于向模型添加新[元素][elements]。|
| `#customLoader(Supplier customLoaderFactory, Consumer action)`           | 使用给定工厂让模型使用[自定义加载器][custommodelloader]，并通过 consumer 配置自定义加载器构建器。这会改变构建器类型，因此可用方法取决于加载器实现。NeoForge 提供几个内置加载器，详见链接文章（包括数据生成）。|
| `#rootTransforms(Consumer<RootTransformsBuilder> action)`                | 通过 consumer 配置在物品显示和方块状态变换之前应用的模型变换。|

:::tip
虽然可通过数据生成创建复杂精细的模型，但更建议使用 [Blockbench][blockbench] 等建模软件创建复杂模型，然后直接使用导出的模型，或把它作为其他模型的父模型。
:::

### 创建模型实例

现在有 `ModelTemplate`，可以调用任意 `ModelTemplate#create*` 方法生成模型。各 create 方法参数不同，但核心参数都包括：表示文件名的 `Identifier`、把 `TextureSlot` 映射到相对于 `textures` 目录的 `Identifier` 的 `TextureMapping`，以及作为 `BiConsumer<Identifier, ModelInstance>` 的模型输出。方法会创建用于生成模型的 `JsonObject`，如果提供重复项则抛出错误。

:::note
调用基础 `create` 方法不会应用保存的后缀，只有接收方块或物品的 `create*` 方法才会应用。
:::

```java
// 给定某个 BiConsumer<Identifier, ModelInstance> modelOutput
// 假设有 DeferredBlock<Block> EXAMPLE_BLOCK
EXAMPLE_TEMPLATE.create(
    // 在 'assets/minecraft/models/block/example_block_example.json' 创建模型
    EXAMPLE_BLOCK.get(),
    // 在槽中定义纹理
    new TextureMapping()
        // "particle": "examplemod:item/example_block"
        .put(TextureSlot.PARTICLE, TextureMapping.getBlockTexture(EXAMPLE_BLOCK.get()))
        // "base": "examplemod:item/example_block_base"
        .put(TextureSlot.BASE, TextureMapping.getBlockTexture(EXAMPLE_BLOCK.get(), "_base")),
    // 生成模型 JSON 的 consumer
    modelOutput
);
```

有时生成的模型使用相似模板，纹理也遵循相似命名规则（例如普通方块的纹理就是方块名称）。这时可创建 `TexturedModel.Provider` 来减少重复。该 provider 本质上是接收 `Block` 并返回 `TexturedModel`（`ModelTemplate`/`TextureMapping` 对）以生成模型的函数式接口。它通过 `TexturedModel#createDefault` 构造，接收把 `Block` 映射到 `TextureMapping` 的函数和要使用的 `ModelTemplate`。然后用待生成 `Block` 调用 `TexturedModel.Provider#create` 即可生成模型。

```java
public static final TexturedModel.Provider EXAMPLE_TEMPLATE_PROVIDER = TexturedModel.createDefault(
    // 方块到纹理的映射
    block -> new TextureMapping()
        .put(TextureSlot.PARTICLE, TextureMapping.getBlockTexture(block))
        .put(TextureSlot.BASE, TextureMapping.getBlockTexture(block, "_base")),
    // 用于生成的模板
    EXAMPLE_TEMPLATE
);

// 给定某个 BiConsumer<Identifier, ModelInstance> modelOutput
// 假设有 DeferredBlock<Block> EXAMPLE_BLOCK
EXAMPLE_TEMPLATE_PROVIDER.create(
    // 在 'assets/minecraft/models/block/example_block_example.json' 创建模型
    EXAMPLE_BLOCK.get(),
    // 生成模型 JSON 的 consumer
    modelOutput
);
```

## `ModelProvider`

方块和物品模型数据生成都使用 `registerModels` 提供的生成器，分别为 `BlockModelGenerators` 和 `ItemModelGenerators`。每个生成器都会生成模型 JSON 及所需附加文件（方块状态、客户端物品）。生成器提供多种辅助方法，把整套文件构造合并成简单调用，例如用 `ItemModelGenerators#generateFlatItem` 和 `ModelTemplates#FLAT_ITEM` 创建基础 `item/generated` 模型，或用 `BlockModelGenerators#createTrivialCube` 创建基础 `block/cube_all` 模型。

```java
public class ExampleModelProvider extends ModelProvider {

    public ExampleModelProvider(PackOutput output) {
        // 把 "examplemod" 替换为你自己的模组 ID。
        super(output, "examplemod");
    }

    @Override
    protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
        // 在此生成模型及关联文件
    }
}
```

与其他数据 provider 一样，不要忘记把 provider 注册到事件：

```java
@SubscribeEvent // 在模组事件总线上
public static void gatherData(GatherDataEvent.Client event) {
    event.createProvider(ExampleModelProvider::new);
}
```

### 方块模型数据生成

要实际生成方块状态和方块模型文件，可以在 `ModelProvider#registerModels` 中调用 `BlockModelGenerators` 的众多公开方法，也可以自行把生成文件传给方块状态输出 `blockStateOutput`、非简单客户端物品输出 `itemModelOutput` 和模型 JSON 输出 `modelOutput`。

:::note
如果方块注册了关联 `BlockItem`，但没有生成客户端物品，`ModelProvider` 会自动使用默认方块模型位置 `assets/<namespace>/models/block/<path>.json` 作为模型生成客户端物品。
:::

```java
public class ExampleModelProvider extends ModelProvider {

    public ExampleModelProvider(PackOutput output) {
        // 把 "examplemod" 替换为你自己的模组 ID。
        super(output, "examplemod");
    }

    @Override
    protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
        // 占位符，实际使用时替换为真实值。模型构建器用法见上文，
        // 模型构建器提供的辅助方法见下文。
        Block block = MyBlocksClass.EXAMPLE_BLOCK.get();

        // 创建六面使用同一纹理的简单方块模型。
        // 纹理必须位于 assets/<namespace>/textures/block/<path>.png，其中
        // <namespace> 和 <path> 分别是方块注册名的命名空间和路径。
        // 大多数完整方块使用此方法，例如木板、圆石或砖块。
        blockModels.createTrivialCube(block);

        // 接收 `TexturedModel.Provider` 的重载。
        blockModels.createTrivialBlock(block, EXAMPLE_TEMPLATE_PROVIDER);

        // 方块物品会自动生成模型
        // 但假设你要生成其他物品模型，例如平面物品
        blockModels.registerSimpleFlatItemModel(block);

        // 添加原木方块模型。需要两个纹理：
        // assets/<namespace>/textures/block/<path>.png 和 assets/<namespace>/textures/block/<path>_top.png，
        // 分别作为侧面和顶部纹理。这里的方块输入限制为 RotatedPillarBlock，即原版原木使用的类。
        blockModels.woodProvider(block).log(block);
        
        // 类似 WoodProvider#logWithHorizontal。用于石英柱等方块。
        blockModels.createRotatedPillarWithHorizontalVariant(block, TexturedModel.COLUMN_ALT, TexturedModel.COLUMN_HORIZONTAL_ALT);

        // 使用 `ExtendedModelTemplate` 指定渲染类型。
        blockModels.createRotatedPillarWithHorizontalVariant(block,
            TexturedModel.COLUMN_ALT.updateTemplate(template ->
                template.extend().renderType("minecraft:cutout").build()
            ),
            TexturedModel.COLUMN_HORIZONTAL_ALT.updateTemplate(template ->
                template.extend().renderType(this.mcLocation("cutout_mipped")).build()
            )
        );

        // 指定可水平旋转、带侧面、前面和顶部纹理的方块模型。
        // 底部也会使用侧面纹理。不需要前面或顶部纹理时，
        // 可把侧面纹理传两次。熔炉等方块使用此方法。
        blockModels.createHorizontallyRotatedBlock(
            block,
            TexturedModel.Provider.ORIENTABLE_ONLY_TOP.updateTexture(mapping ->
                mapping.put(TextureSlot.SIDE, this.modLocation("block/example_texture_side"))
                .put(TextureSlot.FRONT, this.modLocation("block/example_texture_front"))
                .put(TextureSlot.TOP, this.modLocation("block/example_texture_top"))
            )
        );

        // 指定可水平旋转并附着在某个面上的方块模型，例如按钮。
        // 会处理方块放在地面和天花板上的情况，并相应旋转。
        blockModels.familyWithExistingFullBlock(block).button(block);

        // 创建用于方块状态文件的模型
        Identifier modelLoc = TexturedModel.CUBE.create(block, blockModels.modelOutput);

        // 创建用于变换的通用变体
        Variant variant = new Variant(modelLoc);

        // 基础单变体模型
        blockModels.blockStateOutput.accept(
            MultiVariantGenerator.dispatch(
                block,
                new MultiVariant(
                    WeightedList.of(
                        new Weighted<>(
                            // 设置模型
                            variant
                                // 设置绕 x 轴和 y 轴的旋转
                                .with(VariantMutator.X_ROT.withValue(Quadrant.R90))
                                .with(VariantMutator.Y_ROT.withValue(Quadrant.R180))
                                // 设置 uvlock
                                .with(VariantMutator.UV_LOCK.withValue(true)),
                            // 设置权重
                            5
                        )
                    )
                )
            )
        );

        // 根据方块状态属性添加一个或多个模型
        blockModels.blockStateOutput.accept(
            MultiVariantGenerator.dispatch(
                block,
                // 创建基础多变体
                BlockModelGenerators.variant(variant)
            ).with(
                // 应用属性分发
                // 根据提供的 mutator 修改变体
                PropertyDispatch.modify(BlockStateProperties.AXIS)
                    .select(Direction.Axis.Y, BlockModelGenerators.NOP)
                    .select(Direction.Axis.Z, BlockModelGenerators.X_ROT_90)
                    .select(Direction.Axis.X, BlockModelGenerators.X_ROT_90.then(BlockModelGenerators.Y_ROT_90))
            )
        );

        // 生成 multipart
        blockModels.blockStateOutput.accept(
            MultiPartGenerator.multiPart(block)
                // 提供基础模型
                .with(BlockModelGenerators.variant(variant))
                // 添加变体出现的条件
                .with(
                    // 添加要应用的条件
                    new CombinedCondition(
                        CombinedCondition.Operation.OR,
                        List.of(
                            // 至少一个条件为 true 的位置
                            BlockModelGenerators.condition().term(BlockStateProperties.FACING, Direction.NORTH, Direction.SOUTH)
                            // 可按需嵌套任意多的条件或组
                            new CombinedCondition(
                                CombinedCondition.Operation.AND,
                                List.of(
                                    BlockModelGenerators.condition().term(BlockStateProperties.FACING, Direction.NORTH)
                                )
                            )
                        )
                    ),
                    // 提供要修改的变体
                    BlockModelGenerators.variant(variant)
                )
        );
    }
}
```

## 物品模型数据生成

生成物品模型要简单得多，主要因为 `ItemModelGenerators` 和 `ItemModelUtils` 提供了处理属性信息的大量辅助方法。与上文类似，可以在 `ModelProvider#registerModels` 中调用 `ItemModelGenerators` 的公开方法，也可以自行把文件传给非简单客户端物品输出 `itemModelOutput` 和模型 JSON 输出 `modelOutput`。

```java
public class ExampleModelProvider extends ModelProvider {

    public ExampleModelProvider(PackOutput output) {
        // 把 "examplemod" 替换为你自己的模组 ID。
        super(output, "examplemod");
    }

    @Override
    protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
        // 最常见物品模型
        // 使用物品名称作为 layer0 纹理的 item/generated
        itemModels.generateFlatItem(MyItemsClass.EXAMPLE_ITEM.get(), ModelTemplates.FLAT_ITEM);

        // 弓类物品
        ItemModel.Unbaked bow = ItemModelUtils.plainModel(ModelLocationUtils.getModelLocation(MyItemsClass.EXAMPLE_ITEM.get()));
        ItemModel.Unbaked pullingBow0 = ItemModelUtils.plainModel(this.createFlatItemModel(MyItemsClass.EXAMPLE_ITEM.get(), "_pulling_0", ModelTemplates.BOW));
        ItemModel.Unbaked pullingBow1 = ItemModelUtils.plainModel(this.createFlatItemModel(MyItemsClass.EXAMPLE_ITEM.get(), "_pulling_1", ModelTemplates.BOW));
        ItemModel.Unbaked pullingBow2 = ItemModelUtils.plainModel(this.createFlatItemModel(MyItemsClass.EXAMPLE_ITEM.get(), "_pulling_2", ModelTemplates.BOW));
        this.itemModelOutput.accept(
            MyItemsClass.EXAMPLE_ITEM.get(),
            // 物品的条件模型
            ItemModelUtils.conditional(
                // 检查物品是否正在使用
                ItemModelUtils.isUsingItem(),
                // 为 true 时根据使用时长选择模型
                ItemModelUtils.rangeSelect(
                    new UseDuration(false),
                    // 应用到阈值的标量
                    0.05F,
                    pullingBow0,
                    // 阈值 0.65
                    ItemModelUtils.override(pullingBow1, 0.65F),
                    // 阈值 0.9
                    ItemModelUtils.override(pullingBow2, 0.9F)
                ),
                // 为 false 时使用基础弓模型
                bow
            ),
            // 渲染过程中使用的一些设置
            new ClientItem.Properties(
                // 为 false 时禁用物品切换时抬向其正常位置的动画
                false,
                // 为 true 时允许模型在 GUI 中渲染到已定义槽位边界
                //（定义于 GuiItemRenderState#bounds）之外，而不是被裁剪
                false,
                // 把标量应用到切换时的手部高度
                1.0F
            )
        );
    }
}
```

[ao]: https://en.wikipedia.org/wiki/Ambient_occlusion
[blockbench]: https://www.blockbench.net
[citems]: items.md
[custommodelloader]: modelloaders.md#datagen
[datagen]: ../../index.md#data-generation
[elements]: index.md#elements
