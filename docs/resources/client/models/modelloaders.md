# 自定义模型加载器

模型只是一个形状，可以是立方体、一组立方体、一组三角形或任意其他几何形状（或形状集合）。大多数上下文中，模型如何定义并不重要，因为最终都会烘焙成 `QuadCollection`。因此 NeoForge 添加了注册自定义模型加载器的能力，可把任意模型转换为游戏使用的烘焙格式。

## 模型加载器 {#model-loaders}

方块模型的入口仍是模型 JSON 文件，不过可以在 JSON 根对象中指定 `loader` 字段，用你的加载器替代默认加载器。自定义模型加载器可以忽略默认加载器要求的所有字段。

除默认加载器外，NeoForge 还提供几个用途不同的内置加载器。

### 复合模型 {#composite-model}

复合模型用于在父模型中指定多个模型部件，并在子模型中只应用其中一部分。示例最易说明。假设 `examplemod:example_composite_model` 的父模型如下：

```json5
{
    "loader": "neoforge:composite",
    // 指定模型部件。
    "children": {
        // 可以是另一个模型的引用，也可以是模型本身。
        "part_1": {
            "parent": "examplemod:some_model_1"
        },
        "part_2": {
            "parent": "examplemod:some_model_2"
        }
    },
    "visibility": {
        // 默认禁用 part 2。
        "part_2": false
    }
}
```

然后在 `examplemod:example_composite_model` 的子模型中启用或禁用单独部件：

```json5
{
    "parent": "examplemod:example_composite_model",
    // 覆盖可见性。缺少某个部件时，继承父模型的可见性值。
    "visibility": {
        "part_1": false,
        "part_2": true
    }
}
```

要[数据生成][modeldatagen]该模型，请使用自定义加载器类 `CompositeModelBuilder`。

:::warning
复合模型加载器不应用于[客户端物品][citems]的模型。客户端物品应使用定义中提供的[复合模型][itemcomposite]。
:::

### 空模型

空模型不渲染任何内容。

```json5
{
    "loader": "neoforge:empty"
}
```

### OBJ 模型

OBJ 模型加载器允许在游戏中使用 Wavefront `.obj` 3D 模型，从而支持任意形状（包括三角形、圆形等）。`.obj` 模型必须放在 `models` 文件夹（或其子文件夹）中，并提供同名 `.mtl` 文件（或手动指定）。例如，位于 `models/block/example.obj` 的 OBJ 模型必须有对应 MTL 文件 `models/block/example.mtl`。

```json5
{
    "loader": "neoforge:obj",
    // 必需。模型文件引用。注意它相对于命名空间根目录，而不是 models 文件夹。
    "model": "examplemod:models/example.obj",
    // 通常 .mtl 文件必须与 .obj 位于同一位置，只有扩展名不同，
    // 加载器会自动找到它。需要时也可以手动设置 .mtl 文件位置。
    "mtl_override": "examplemod:models/example_other_name.mtl",
    // 可在 .mtl 文件中用 #texture0、#particle 等引用这些纹理。
    // 这通常需要手动编辑 .mtl 文件。
    "textures": {
        "texture0": "minecraft:block/cobblestone",
        "particle": "minecraft:block/stone"
    },
    // 启用或禁用模型自动剔除。可选，默认 true。
    "automatic_culling": false,
    // 是否对方块进行明暗处理。可选，默认 true。
    "shade_quads": false,
    // 一些建模程序假设 V=0 是底部而不是顶部。此属性会翻转 V。可选，默认 false。
    "flip_v": true,
    // 是否启用自发光。可选，默认 true。
    "emissive_ambient": false
}
```

要[数据生成][modeldatagen]该模型，请使用自定义加载器类 `ObjModelBuilder`。

### 创建自定义模型加载器

创建自己的模型加载器需要四个类和一个事件处理器：

- `UnbakedModelLoader` 类
- `UnbakedGeometry` 类，通常是 `ExtendedUnbakedGeometry` 实例
- `UnbakedModel` 类，通常是 `AbstractUnbakedModel` 实例
- 保存已烘焙四边形的 `QuadCollection` 类，通常直接使用该类
- 在[客户端][sides]为 `ModelEvent.RegisterLoaders` 注册未烘焙模型加载器的[事件处理器][event]
- 可选：为需要缓存加载数据的模型加载器添加 `AddClientReloadListenersEvent` [客户端][sides][事件处理器][event]

为说明这些类如何连接，下面跟随一个模型加载过程：

- 模型加载期间，`loader` 属性设为你的加载器的模型 JSON 会传给未烘焙模型加载器。加载器读取 JSON，并根据模型属性和模型未烘焙四边形构造 `UnbakedGeometry`，返回 `UnbakedModel`。
- 模型烘焙期间，调用 `UnbakedGeometry#bake`，返回 `QuadCollection`。
- 模型渲染期间，`QuadCollection` 与[客户端物品][citems]或[方块状态定义][blockstatedefinition]所需的其他信息一起用于渲染。

:::note
如果为物品或方块状态使用的模型创建自定义加载器，根据场景，创建新 `ItemModel` 或 `BlockStateModel` 可能更合适。例如，使用或生成 `QuadCollection` 的模型更适合作为 `ItemModel` 或 `BlockStateModel`，而解析 `.obj` 等不同数据格式的模型应使用新的模型加载器。
:::

下面用一个基础类结构说明。加载器类为 `MyUnbakedModelLoader`，未烘焙模型类为 `MyUnbakedModel`，未烘焙几何体为 `MyUnbakedGeometry`。同时假设加载器需要一些缓存：

```java
// 该类把模型加载为未烘焙格式
public class MyUnbakedModelLoader implements UnbakedModelLoader<MyUnbakedModel>, ResourceManagerReloadListener {
    // 强烈建议使用单例模式，所有模型都可经一个加载器加载。
    public static final MyUnbakedModelLoader INSTANCE = new MyUnbakedModelLoader();
    // 用于注册加载器的 ID，也用于加载器数据生成类。
    public static final Identifier ID = Identifier.fromNamespaceAndPath("examplemod", "my_custom_loader");

    // 遵循单例模式，把构造方法设为私有。
    private MyUnbakedModelLoader() {}

    @Override
    public void onResourceManagerReload(ResourceManager resourceManager) {
        // 处理任意缓存清理逻辑
    }

    @Override
    public MyUnbakedModel read(JsonObject obj, JsonDeserializationContext context) throws JsonParseException {
        // 使用 JsonObject，必要时用 JsonDeserializationContext 读取模型 JSON 属性。
        // MyUnbakedModel 构造方法可以有参数（见下文）。

        // 读取用于创建四边形的数据
        MyUnbakedGeometry geometry;

        // 原版和 NeoForge 提供的基础参数可使用 StandardModelParameters
        StandardModelParameters params = StandardModelParameters.parse(obj, context);

        return new MyUnbakedModel(params, geometry);
    }
}

// 保存待渲染的未烘焙四边形
// 未烘焙模型中的其他信息应传入 context map
public class MyUnbakedGeometry implements ExtendedUnbakedGeometry {

    public MyUnbakedGeometry(...) {
        // 保存待烘焙的未烘焙四边形
    }

    // 负责烘焙模型并返回四边形集合。参数为：
    // - 纹理名称到关联材质的映射。
    // - 模型烘焙器。可取得子模型进行烘焙，也可从纹理槽取得精灵。
    // - 模型状态。保存方块状态文件中的变换，通常为旋转和 uvlock。
    // - 模型名称。
    // - NeoForge 和未烘焙模型提供的 ContextMap 设置。所有可用属性见 'NeoForgeModelProperties'。
    @Override
    public QuadCollection bake(TextureSlots textureSlots, ModelBaker baker, ModelState state, ModelDebugName debugName, ContextMap additionalProperties) {
        // 创建集合的构建器
        var builder = new QuadCollection.Builder();
        // 构建待烘焙四边形
        builder.addUnculledFace(...); // 或 addCulledFace(Direction, BakedQuad)
        // 创建四边形集合
        return builder.build();
    }
}

// 未烘焙模型包含从 JSON 读取的全部信息。
// 它提供基础设置和几何体。
// 继承 AbstractUnbakedModel 会设置原版和 NeoForge 的属性方法
public class MyUnbakedModel extends AbstractUnbakedModel {

    private final MyUnbakedGeometry geometry;

    public MyUnbakedModel(StandardModelParameters params, MyUnbakedGeometry geometry) {
        super(params);
        this.geometry = geometry;
    }

    @Override
    public UnbakedGeometry geometry() {
        // 用于构造已烘焙四边形的几何体
        return this.geometry;
    }

    @Override
    public void fillAdditionalProperties(ContextMap.Builder propertiesBuilder) {
        super.fillAdditionalProperties(propertiesBuilder);
        // 通过 withParameter(ContextKey<T>, T) 添加额外属性
        // 之后可在 UnbakedGeometry#bake 提供的 ContextMap 中访问
    }
}
```

完成后，不要忘记真正注册加载器：

```java
@SubscribeEvent // 仅在物理客户端的模组事件总线上
public static void registerLoaders(ModelEvent.RegisterLoaders event) {
    event.register(MyUnbakedModelLoader.ID, MyUnbakedModelLoader.INSTANCE);
}

// 如果模型加载器缓存数据：
@SubscribeEvent // 仅在物理客户端的模组事件总线上
public static void addClientResourceListeners(AddClientReloadListenersEvent event) {
    // 用 ID 注册监听器
    event.addListener(MyUnbakedModelLoader.ID, MyUnbakedModelLoader.INSTANCE);
    // 添加依赖，让模型加载器在模型加载前运行
    // 这样可在新数据填充前清空缓存
    event.addDependency(MyUnbakedModelLoader.ID, VanillaClientListeners.MODELS);
}
```

#### 模型加载器数据生成 {#datagen}

当然也可以[数据生成][datagen]模型。为此需要继承 `CustomLoaderBuilder`：

```java
public class MyLoaderBuilder extends CustomLoaderBuilder {
    public MyLoaderBuilder() {
        super(
            // 模型加载器 ID。
            MyUnbakedModelLoader.ID,
            // 加载器缺失时是否允许使用内联原版元素作为回退。
            false
        );
    }
    
    // 在此添加字段和 setter，随后可在下文使用这些字段。

    @Override
    protected CustomLoaderBuilder copyInternal() {
        // 创建加载器构建器的新实例，并复制当前属性
        MyLoaderBuilder builder = new MyLoaderBuilder();
        // builder.<field> = this.<field>;
        return builder;
    }
    
    // 把模型序列化为 JSON。
    @Override
    public JsonObject toJson(JsonObject json) {
        // 把字段添加到给定 JsonObject。
        // 然后调用 super 添加 loader 属性和其他内容。
        return super.toJson(json);
    }
}
```

在方块（或物品）[模型数据生成][modeldatagen]中使用该构建器：

```java
// 假设继承 ModelProvider，并存在 DeferredBlock<Block> EXAMPLE_BLOCK。
// customLoader() 参数是构造构建器的 Supplier 和设置属性的 Consumer。
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    blockModels.createTrivialBlock(
        // 要生成模型的方块
        EXAMPLE_BLOCK.get(),
        TexturedModel.createDefault(
            // 用于取得纹理的映射
            block -> new TextureMapping().put(
                TextureSlot.ALL, TextureMapping.getBlockTexture(block)
            ),
            // 用于创建 JSON 的模型模板构建器
            ExtendedModelTemplateBuilder.builder()
                // 声明使用自定义模型加载器
                .customLoader(MyLoaderBuilder::new, loader -> {
                    // 在此设置任意必需字段
                })
                // 模型所需纹理
                .requiredTextureSlot(TextureSlot.ALL)
                // 完成后调用 build
                .build()
        )
    );
}
```

#### 可见性

`CustomLoaderBuilder` 默认实现包含应用可见性的方法。模型加载器可以自行选择使用或忽略 `visibility` 属性。目前只有[复合模型加载器][composite]和 [OBJ 加载器][obj]使用该属性。

## 方块状态模型加载器 {#block-state-model-loaders}

方块状态模型与模型 JSON 文件分开处理，因此 NeoForge 也提供自定义加载器，通过在变体或 multipart 中指定 `type` 使用。自定义方块状态模型加载器可以忽略原加载器要求的所有字段。

### 复合方块状态模型

复合方块状态模型可把多个 `BlockStateModel` 一起渲染。

```json5
{
    "variants": {
        "": {
            "type": "neoforge:composite",
            // 指定模型部件。
            "models": [
                // 必须内联方块状态模型
                {
                    "variants": {
                        // ...
                    }
                },
                {
                    "multipart": [
                        // ...
                    ]
                }
                // ...
            ]
        }
    }
}
```

要[数据生成][modeldatagen]该方块状态模型，请使用自定义加载器类 `CompositeBlockStateModelBuilder`。

### 复用默认模型加载器

某些场景下，应复用原版模型加载器，在自己的模型逻辑中构建，而不是完全替换它。可使用一个技巧：在模型加载器中移除 `loader` 属性，再把 JSON 发回模型反序列化器，让它以为是普通未烘焙模型。随后在烘焙前按需修改模型或几何体。

```java
public class MyUnbakedModelLoader implements UnbakedModelLoader<MyUnbakedModel> {
    public static final MyUnbakedModelLoader INSTANCE = new MyUnbakedModelLoader();
    public static final Identifier ID = Identifier.fromNamespaceAndPath("examplemod", "my_custom_loader");
    
    private MyUnbakedModelLoader() {}

    @Override
    public MyUnbakedModel read(JsonObject jsonObject, JsonDeserializationContext context) throws JsonParseException {
        // 移除 loader 字段，让反序列化器以为是普通模型
        // 然后交给反序列化器。
        jsonObject.remove("loader");
        UnbakedModel model = context.deserialize(jsonObject, UnbakedModel.class);
        return new MyUnbakedModel(model, /* 其他参数 */);
    }
}

// 继承委托类，因为它保存被包装模型
public class MyUnbakedModel extends DelegateUnbakedModel {

    // 保存模型供下文使用
    public MyUnbakedModel(UnbakedModel model, /* 其他参数 */) {
       super(model);
    }
}
```

### 创建自定义方块状态模型加载器

创建自定义方块状态模型加载器需要五个类和一个事件处理器：

- 加载方块状态模型的 `CustomUnbakedBlockStateModel` 类
- 烘焙模型的 `BlockStateModel` 类，通常是 `DynamicBlockStateModel` 实例
- 加载模型 JSON 的 `BlockStateModelPart.Unbaked`
- 对给定面或模型应用变换的 `ModelState`
- 保存四边形、环境光遮蔽和粒子纹理的 `BlockStateModelPart`，常见实现为 `SimpleModelWrapper`
- 在[客户端][sides]注册未烘焙方块状态模型加载器 codec 的 `RegisterBlockStateModels` [事件处理器][event]

为说明连接关系，下面跟随方块状态模型加载过程：

- 定义加载期间，变体、multipart 或[自定义定义][customdefinition]中 `type` 属性设为你的加载器的方块状态模型会解码为 `CustomUnbakedBlockStateModel`。
- 模型烘焙期间，调用 `CustomUnbakedBlockStateModel#bake`，返回包含一组 `BlockStateModelPart` 的 `BlockStateModel`。
- 模型渲染期间，`BlockStateModel#collectParts` 收集待渲染的 `BlockStateModelPart`。

基础类结构如下。已烘焙模型名为 `MyBlockStateModel`，未烘焙类为内部 record `MyBlockStateModel.Unbaked`，模型部件为 `MyBlockStateModelPart`，未烘焙部件为内部 record `MyBlockStateModelPart.Unbaked`，`ModelState` 为 `MyModelState`：

```java
// 用于应用必要变换的模型状态
// 如果使用中间对象保存模型状态，它必须能转换为 ModelState
public class MyModelState implements ModelState {

    // 用于未烘焙方块模型部件
    public static final Codec<MyModelState> CODEC = Codec.unit(new MyModelState());

    public MyModelState() {}

    @Override
    public Transformation transformation() {
        // 返回应用到烘焙顶点的模型旋转
        return Transformation.identity();
    }

    @Override
    public Matrix4fc faceTransformation(Direction direction) {
        // 返回变换后应用到模型给定面的矩阵
        // 原版目前不使用此方法
        return NO_TRANSFORM;
    }

    @Override
    public Matrix4fc inverseFaceTransformation(Direction direction) {
        // 返回应用到模型给定面的 faceTransformation 逆矩阵
        // 会传给 FaceBakery
        return NO_TRANSFORM;
    }
}

// 表示已烘焙模型的模型部件
// useAmbientOcclusion 和 particleMaterial 由 record 实现
public record MyBlockStateModelPart(QuadCollection quads, boolean useAmbientOcclusion, Material.Baked particleMaterial) implements BlockStateModelPart {

    // 取得待渲染的已烘焙四边形
    @Override
    List<BakedQuad> getQuads(@Nullable Direction direction) {
        return this.quads.getQuads(direction);
    }

    // 四边形所用材质的标志。
    @Override
    public int materialFlags() {
        return this.quads.materialFlags();
    }

    // 从方块状态 JSON 读取的未烘焙模型
    public record Unbaked(Identifier modelLocation, MyModelState modelState) implements BlockStateModelPart.Unbaked {

        // 用于未烘焙方块状态模型
        public static final MapCodec<MyBlockStateModelPart.Unbaked> CODEC = RecordCodecBuilder.mapCodec(
            instance -> instance.group(
                Identifier.CODEC.fieldOf("model").forGetter(MyBlockStateModelPart.Unbaked::modelLocation),
                MyModelState.CODEC.fieldOf("state").forGetter(MyBlockStateModelPart.Unbaked::modelState)
            ).apply(instance, MyBlockStateModelPart.Unbaked::new)
        );

        @Override
        public void resolveDependencies(ResolvableModel.Resolver resolver) {
            // 标记模型部件使用的所有模型
            resolver.markDependency(this.modelLocation);
        }

        @Override
        public BlockStateModelPart bake(ModelBaker baker) {
            // 取得要烘焙的模型
            ResolvedModel resolvedModel = baker.getModel(this.modelLocation);

            // 取得模型部件所需设置
            TextureSlots slots = resolvedModel.getTopTextureSlots();
            boolean ao = resolvedModel.getTopAmbientOcclusion();
            Material.Baked particle = resolvedModel.resolveParticleMaterial(slots, baker);
            QuadCollection quads = resolvedModel.bakeTopGeometry(slots, baker, this.modelState);
            
            // 返回已烘焙部件
            return new MyBlockStateModelPart(quads, ao, particle);
        }
    }
}

// 表示已烘焙方块状态的模型
public record MyBlockStateModel(MyBlockStateModelPart model) implements DynamicBlockStateModel {

    // 设置粒子材质
    // 必须实现，但实际逻辑应委托给感知关卡的版本
    @Override
    public Material.Baked particleMaterial() {
        return this.model.particleMaterial();
    }

    // 四边形所用材质的标志。
    // 必须实现，但实际逻辑应委托给感知关卡的版本
    @Override
    public int materialFlags() {
        return this.quads.materialFlags();
    }

    // 实际上作为复用此前生成几何体的键。通常应尽量保持确定性。
    @Override
    public Object createGeometryKey(BlockAndTintGetter level, BlockPos pos, BlockState state, RandomSource random) {
        return this;
    }

    // 负责收集待渲染部件。参数为：
    // - 方块和色彩 getter，通常是关卡。
    // - 要渲染方块的位置。
    // - 方块状态。
    // - 随机实例。
    // - 待渲染模型部件列表。在此添加模型部件。
    @Override
    public void collectParts(BlockAndTintGetter level, BlockPos pos, BlockState state, RandomSource random, List<BlockStateModelPart> parts) {
        // 如果希望方块渲染依赖方块实体（例如方块实体实现 `BlockEntity#getModelData`），
        // 可对位置调用 `BlockAndTintGetter#getModelData`
        // 可用 `ModelProperty` 键调用 `get` 读取属性
        // 记住方块实体应调用 `BlockEntity#requestModelDataUpdate` 把模型数据同步到客户端
        ModelData data = level.getModelData(pos);

        // 添加待渲染模型
        parts.add(this.model);
    }

    @Override
    public Material.Baked particleMaterial(BlockAndTintGetter level, BlockPos pos, BlockState state) {
        // 如果要用关卡决定渲染哪个粒子，重写此方法
        return self().particleMaterial();
    }

    @Override
    public int materialFlags(BlockAndTintGetter level, BlockPos pos, BlockState state) {
        // 如果要用关卡决定模型材质标志，重写此方法
        return self().materialFlags();
    }

    // 从方块状态 JSON 读取的未烘焙模型
    public record Unbaked(MyBlockStateModelPart.Unbaked model) implements CustomUnbakedBlockStateModel {

        // 要注册的 codec
        public static final MapCodec<MyBlockStateModel.Unbaked> CODEC = MyBlockStateModelPart.Unbaked.CODEC.xmap(
            MyBlockStateModel.Unbaked::new, MyBlockStateModel.Unbaked::model
        );
        public static final Identifier ID = Identifier.fromNamespaceAndPath("examplemod", "my_custom_model_loader");

        @Override
        public void resolveDependencies(ResolvableModel.Resolver resolver) {
            // 标记状态模型使用的所有模型
            this.model.resolveDependencies(resolver);
        }

        @Override
        public BlockStateModel bake(ModelBaker baker) {
            // 烘焙模型部件并传入方块状态模型
            return new MyBlockStateModel(this.model.bake(baker));
        }
    }
}
```


完成后，不要忘记真正注册加载器：

```java
@SubscribeEvent // 仅在物理客户端的模组事件总线上
public static void registerDefinitions(RegisterBlockStateModels event) {
    event.registerModel(MyBlockStateModel.Unbaked.ID, MyBlockStateModel.Unbaked.CODEC);
}
```

#### 状态模型加载器数据生成

当然也可以[数据生成][datagen]模型。为此需要继承 `CustomBlockStateModelBuilder`：

```java
// 用于构造方块状态 JSON 的构建器
public class MyBlockStateModelBuilder extends CustomBlockStateModelBuilder {

    private MyBlockStateModelPart.Unbaked model;

    public MyBlockStateModelBuilder() {}
    
    // 在此添加字段和 setter，随后可在下文使用这些字段。

    @Override
    public MyBlockStateModelBuilder with(VariantMutator variantMutator) {
        // 如果要应用假定未烘焙模型部件是 `Variant` 的 mutator
        // 否则此方法应不做任何事
        return this;
    }

    // 用于通用未烘焙方块状态模型
    @Override
    public MyBlockStateModelBuilder with(UnbakedMutator unbakedMutator) {
        var result = new MyBlockStateModelBuilder();

        if (this.model != null) {
            result.model = unbakedMutator.apply(this.model);
        }

        return result;
    }

    // 把构建器转换为未烘焙变体以便编码
    @Override
    public CustomUnbakedBlockStateModel toUnbaked() {
        return new MyBlockStateModel.Unbaked(this.model);
    }
}
```

在方块（或物品）[模型数据生成][modeldatagen]中使用该状态定义加载器构建器：

```java
// 假设继承 ModelProvider，并存在 DeferredBlock<Block> EXAMPLE_BLOCK。
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    blockModels.blockStateOutput.accept(
        MultiVariantGenerator.dispatch(
            // 要生成模型的方块
            EXAMPLE_BLOCK.get(),
            // 自定义方块状态构建器
            MultiVariant.of(new CustomBlockStateModelBuilder().with(...))
        )
    );
}
```

这会生成类似下面的模型：

```json5
{
  "variants": {
    "": {
        "type": "examplemod:my_custom_model_loader"
        // 其他字段
    }
  }
}
```

## 方块状态定义加载器 {#block-state-definition-loaders}

单个方块状态模型的加载器处理一个方块状态，而方块状态定义加载器处理整个方块状态文件，通过指定 `neoforge:definition_type` 使用。自定义方块状态定义加载器可以忽略原加载器要求的所有字段。

### 创建自定义方块状态定义加载器

创建自定义方块状态定义加载器需要两个类和一个事件处理器：

- 加载方块状态定义的 `CustomBlockModelDefinition` 类
- 把方块状态烘焙为 `BlockStateModel` 的 `BlockStateModel.UnbakedRoot` 类
- 在[客户端][sides]注册未烘焙方块状态模型加载器 codec 的 `RegisterBlockStateModels` [事件处理器][event]

为说明连接关系，下面跟随方块状态模型加载过程：

- 定义加载期间，`neoforge:definition_type` 属性设为你的加载器的方块状态定义会解码为 `CustomBlockModelDefinition`。
- 随后调用 `CustomBlockModelDefinition#instantiate`，把所有可能方块状态映射到 `BlockStateModel.UnbakedRoot`。简单情况可通过 `BlockStateModel.Unbaked#asRoot` 构造，复杂情况会创建自己的 `BlockStateModel.UnbakedRoot`。
- 模型烘焙期间，为某个 `BlockState` 调用 `BlockStateModel.UnbakedRoot#bake`，返回 `BlockStateModel`。

基础类结构如下。方块模型定义类为 `MyBlockModelDefinition`，复用 `BlockStateModel.Unbaked#asRoot` 构造 `BlockStateModel.UnbakedRoot`：

```java
public record MyBlockModelDefinition(MyBlockStateModel.Unbaked model) implements CustomBlockModelDefinition {

    // 要注册的 codec
    public static final MapCodec<MyBlockModelDefinition> CODEC = MyBlockStateModel.Unbaked.CODEC.xmap(
        MyBlockModelDefinition::new, MyBlockModelDefinition::model
    );
    public static final Identifier ID = Identifier.fromNamespaceAndPath("examplemod", "my_custom_definition_loader");

    // 把所有可能状态映射到某个未烘焙 root
    // root 通常共享方块状态模型，因此常用 `ModelBaker.SharedOperationKey` 缓存加载模型
    @Override
    public Map<BlockState, BlockStateModel.UnbakedRoot> instantiate(StateDefinition<Block, BlockState> states, Supplier<String> sourceSupplier) {
        Map<BlockState, BlockStateModel.UnbakedRoot> result = new HashMap<>();

        // 处理所有可能状态
        var unbakedRoot = this.model.asRoot();
        states.getPossibleStates().forEach(state -> result.put(state, unbakedRoot));

        return result;
    }

    @Override
    public MapCodec<? extends CustomBlockModelDefinition> codec() {
        return CODEC;
    }
}
```

完成后，不要忘记真正注册加载器：

```java
@SubscribeEvent // 仅在物理客户端的模组事件总线上
public static void registerDefinitions(RegisterBlockStateModels event) {
    event.registerDefinition(MyBlockModelDefinition.ID, MyBlockModelDefinition.CODEC);
}
```

#### 状态定义加载器数据生成

当然也可以[数据生成][datagen]定义。为此需要继承 `BlockModelDefinitionGenerator`：

```java
public class MyBlockModelDefinitionGenerator implements BlockModelDefinitionGenerator {

    private final Block block;
    private final MyBlockStateModelBuilder builder;

    private MyBlockModelDefinitionGenerator(Block block, MyBlockStateModelBuilder builder) {
        this.block = block;
        this.builder = builder;
    }

    public static MyBlockModelDefinitionGenerator dispatch(Block block, MyBlockStateModelBuilder builder) {
        return new MyBlockModelDefinitionGenerator(block, builder);
    }

    @Override
    public Block block() {
        // 返回正在生成定义文件的方块
        return this.block;
    }

    @Override
    public BlockModelDefinition create() {
        // 创建用于编码和解码该文件的方块模型定义
        return new MyBlockModelDefinition(this.builder.toUnbaked());
    }
} 
```

在方块（或物品）[模型数据生成][modeldatagen]中使用该状态定义加载器构建器：

```java
// 假设存在 DeferredBlock<Block> EXAMPLE_BLOCK。
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    blockModels.blockStateOutput.accept(
        MyBlockModelDefinitionGenerator.dispatch(
            // 要生成模型的方块
            EXAMPLE_BLOCK.get(),
            new CustomBlockStateModelBuilder(...)
        )
    );
}
```

这会生成类似下面的模型：

```json5
{
    "neoforge:definition_type": "examplemod:my_custom_definition_loader"
    // 其他字段
}
```

[citems]: items.md
[composite]: #composite-model
[customdefinition]: #block-state-definition-loaders
[datagen]: ../../index.md#data-generation
[event]: ../../../concepts/events.md#registering-an-event-handler
[itemcomposite]: items.md#composite-models
[modeldatagen]: datagen.md
[obj]: #obj-model
[sides]: ../../../concepts/sides.md
