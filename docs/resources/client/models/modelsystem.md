# 理解模型系统

Minecraft 中的模型就是带有纹理的四边形列表。模型处理流程的每个部分都有独立实现，底层模型 JSON 会反序列化为 `UnbakedModel`。最终，各条管线会接收一组 `List<BakedQuad>` 以及各自所需属性。一些[方块实体渲染器][ber]也会使用这些模型。模型复杂度没有限制。

模型保存在 `ModelManager` 中，可通过 `Minecraft.getInstance().getModelManager()` 访问。对于物品管线，可以传入 [`Identifier`][rl] 并通过 `ModelManager#getItemModel` 取得关联的 [`ItemModel`][itemmodels]。对于方块状态管线，可以传入 `BlockState` 并通过 `ModelManager.getBlockStateModelSet().get()` 取得关联的 `BlockStateModel`。模组基本上总是复用此前自动加载并烘焙的模型。

## 通用模型与几何体

基础模型 JSON（位于 `assets/<namespace>/models`）会反序列化为 `UnbakedModel`。`UnbakedModel` 通常只比烘焙产物少一步，保存某种通用形式的属性。其中最重要的是 `UnbakedModel#geometry` 中的 `UnbakedGeometry`，表示将变为 `BakedQuad` 的数据。最终通过调用 `UnbakedGeometry#bake`，这些四边形会被内联到物品或方块状态模型中。这通常会构造 `QuadCollection`，其中包含可随时渲染、或仅在给定方向未被剔除时渲染的 `BakedQuad` 列表。建模程序和大多数其他游戏中的图元是三角形，但 Minecraft 整体以方形为主，因此开发者在渲染时选用四边形（4 个顶点），而不是三角形（3 个顶点）。

`UnbakedModel` 包含的信息可能仅供[方块状态定义][bsd]使用、仅供[物品模型][itemmodelsection]使用，或两者共用。例如，`useAmbientOcclusion` 仅由方块状态定义使用，`guiLight` 和 `transforms` 仅由物品模型使用，而 `textureSlots` 与 `parent` 由两者共用。

在烘焙期间，每个 `UnbakedModel` 都会包装进 `ResolvedModel`，由物品或方块状态的 `ModelBaker` 取得。顾名思义，`ResolvedModel` 是解析完所有悬挂引用的 `UnbakedModel`。之后可通过 `getTop*` 系列方法取得关联数据，这些方法会从当前模型及其父模型计算属性和几何体。通常在这里调用 `ResolvedModel#bakeTopGeometry`，把 `ResolvedModel` 烘焙为 `QuadCollection`。

## 方块状态定义 {#block-state-definitions}

方块状态定义 JSON（位于 `assets/<namespace>/blockstates`）会被编译并烘焙为每个 `BlockState` 对应的 `BlockStateModel`。`BlockStateModel` 的创建过程如下：

- 加载阶段：
    - 方块状态定义 JSON 加载进 `BlockStateModel.UnbakedRoot`。root 是共享的通用缓存系统，用于把 `BlockState` 链接到一组 `BlockStateModel`。
    - `BlockStateModel.UnbakedRoot` 加载 `BlockStateModel.Unbaked`，并准备把它们链接到合适的 `BlockState`。
    - `BlockStateModel.Unbaked` 加载 `BlockStateModelPart.Unbaked`，后者用于取得通用 `UnbakedModel`（更准确地说，是 `ResolvedModel`）。
- 烘焙阶段：
    - 为每个 `BlockState` 调用 `BlockStateModel.UnbakedRoot#bake`。
    - 为给定 `BlockState` 调用 `BlockStateModel.Unbaked#bake`，创建 `BlockStateModel`。
    - 为 `BlockStateModel` 中的模型部件调用 `BlockStateModelPart.Unbaked#bake`，把 `ResolvedModel` 内联为 `QuadCollection`，同时默认取得环境光遮蔽设置、粒子图标和渲染类型。

`BlockStateModel` 中最重要的方法是 `collectParts`，负责向待渲染的 `BlockStateModelPart` 列表追加部件。记住，每个 `BlockStateModelPart` 都通过 `BlockStateModelPart#getQuads` 提供其 `BakedQuad` 列表，随后上传到顶点消费者并渲染。`collectParts` 有五个参数：

- `BlockAndTintGetter`：渲染 `BlockState` 所在关卡的表示。
- `BlockPos`：方块渲染位置。
- `BlockState`：正在渲染的[方块状态]。可以为 null，表示正在渲染物品。
- `RandomSource`：可用于随机化的客户端随机源。
- `List<BlockStateModelPart>`：接收待渲染部件的列表。

### 模型数据

有时，`BlockStateModel` 需要依赖 `BlockEntity` 来决定在 `collectParts` 中选择哪些 `BlockStateModelPart`。NeoForge 提供 `ModelData` 系统，用于同步并传递来自 `BlockEntity` 的数据。为此，`BlockEntity` 必须实现 `getModelData` 并返回要同步的数据。之后可以调用 `BlockEntity#requestModelDataUpdate` 把数据发送给客户端。然后在 `collectParts` 中，可用 `BlockPos` 对 `BlockAndTintGetter` 调用 `getModelData` 取得数据。

## 物品模型 {#item-models}

[客户端物品][clientitem] JSON（位于 `assets/<namespace>/items`）会被编译并烘焙成某个 `Item` 的 `ItemModel`，供 `ItemStack` 使用。`ItemModel` 的创建过程如下：

- 加载阶段：
    - 客户端物品 JSON 加载进 `ClientItem`。它保存物品模型以及如何渲染的一些通用属性。
    - `ClientItem` 加载 `ItemModel.Unbaked`。
- 烘焙阶段：
    - 为每个 `Item` 调用 `ItemModel.Unbaked#bake`，把 `ResolvedModel` 内联为 `List<BakedQuad>`；如果 `Item` 是 `BlockItem`，还会取得通用 `ModelRenderProperties` 和渲染类型。

物品渲染信息见[手动渲染物品][itemmodels]一节。

### 视角 {#perspectives}

Minecraft 渲染引擎共识别 8 种物品渲染视角类型（若包含代码中的回退项则为 9 种）。它们用于模型 JSON 的 `display` 块，在代码中由 `ItemDisplayContext` 枚举表示。这些设置通常从 `UnbakedModel` 传入 `ItemModel` 中的 `ModelRenderProperties`，随后通过 `ModelRenderProperties#applyToLayer` 应用到 `ItemStackRenderState`。

| 枚举值                    | JSON 键                    | 用途                                                                                                      |
|---------------------------|----------------------------|-----------------------------------------------------------------------------------------------------------|
| `THIRD_PERSON_RIGHT_HAND` | `"thirdperson_righthand"`  | 第三人称右手（F5 视角或其他玩家）                                                                          |
| `THIRD_PERSON_LEFT_HAND`  | `"thirdperson_lefthand"`   | 第三人称左手（F5 视角或其他玩家）                                                                          |
| `FIRST_PERSON_RIGHT_HAND` | `"firstperson_righthand"`  | 第一人称右手                                                                                                |
| `FIRST_PERSON_LEFT_HAND`  | `"firstperson_lefthand"`   | 第一人称左手                                                                                                |
| `HEAD`                    | `"head"`                   | 位于玩家头部装备槽时（通常只能通过命令实现）                                                                |
| `GUI`                     | `"gui"`                    | 物品栏、玩家快捷栏                                                                                          |
| `GROUND`                  | `"ground"`                 | 掉落物品；注意掉落物品的旋转由掉落物品渲染器处理，而不是模型                                            |
| `FIXED`                   | `"fixed"`                  | 物品展示框                                                                                                  |
| `ON_SHELF`                | `"on_shelf"`               | 架子上                                                                                                      |
| `NONE`                    | `"none"`                   | 代码中的回退用途，不应在 JSON 中使用                                                                       |

NeoForge 允许[扩展] `ItemDisplayContext`，供自定义渲染调用使用。模组的 `ItemDisplayContext` 可以指定模型未指定变换时使用的回退变换；否则行为与原版相同。

## 修改烘焙结果

在代码中修改已有的方块状态模型或物品堆栈模型，通常可以把模型包装进某种委托对象。方块状态模型已有 `DelegateBlockStateModel`，物品堆栈模型则没有现成实现。你的实现可以只重写选定方法：

```java
// 对于方块状态
public class MyDelegateBlockStateModel extends DelegateBlockStateModel {
    // 把原模型传给父类。
    public MyDelegateBlockStateModel(BlockStateModel originalModel) {
        super(originalModel);
    }
    
    // 在此重写任意所需方法。需要时也可以访问 originalModel。
}

// 对于物品模型
public class MyDelegateItemModel implements ItemModel {

    private final ItemModel originalModel;

    public MyDelegateItemModel(ItemModel originalModel) {
        this.originalModel = originalModel;
    }

    // 在此重写任意所需方法。需要时也可以访问 originalModel。
    @Override
    public void update(ItemStackRenderState renderState, ItemStack stack, ItemModelResolver resolver, ItemDisplayContext displayContext, @Nullable ClientLevel level, @Nullable ItemOwner owner, int seed
    ) {
        this.originalModel.update(renderState, stack, resolver, displayContext, level, owner, seed);
    }
}
```

编写模型包装类后，必须把它应用到应受影响的模型上。请在[模组事件总线][modbus]上、[客户端][sides]的 `ModelEvent.ModifyBakingResult` [事件处理器][event]中完成：

```java
@SubscribeEvent // 仅在物理客户端的模组事件总线上
public static void modifyBakingResult(ModelEvent.ModifyBakingResult event) {
    // 对于方块状态模型
    event.getBakingResult().blockStateModels().computeIfPresent(
        // 要修改模型对应的方块状态。
        MyBlocksClass.EXAMPLE_BLOCK.get().defaultBlockState(),
        // BiFunction，参数为位置和原模型，返回新模型。
        (location, model) -> new MyDelegateBakedModel(model);
    );

    // 对于物品模型
    event.getBakingResult().itemStackModels().computeIfPresent(
        // 要修改的模型资源位置。
        // 通常是物品注册名；不过由于 ITEM_MODEL 数据组件，也可以是任意值。
        MyItemsClass.EXAMPLE_ITEM.getKey().identifier(),
        // BiFunction，参数为位置和原模型，返回新模型。
        (location, model) -> new MyDelegateItemModel(model);
    );
}
```

:::warning
尽可能优先使用[自定义模型加载器][modelloader]，而不是在 `ModelEvent.ModifyBakingResult` 中包装已烘焙模型。需要时，自定义模型加载器也可以使用委托模型。
:::

[ao]: https://en.wikipedia.org/wiki/Ambient_occlusion
[ber]: ../../../blockentities/ber.md
[blockstate]: ../../../blocks/states.md
[bsd]: #block-state-definitions
[clientitem]: items.md
[event]: ../../../concepts/events.md
[extended]: ../../../advanced/extensibleenums.md#creating-an-enum-entry
[itemmodels]: items.md#manually-rendering-an-item
[itemmodelsection]: #item-models
[livingentity]: ../../../entities/livingentity.md
[modbus]: ../../../concepts/events.md#event-buses
[modelloader]: modelloaders.md
[rl]: ../../../misc/identifier.md
[perspective]: #perspectives
[sides]: ../../../concepts/sides.md
