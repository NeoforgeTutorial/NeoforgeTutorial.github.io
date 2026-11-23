# 方块实体渲染器 {#blockentityrenderer}

`BlockEntityRenderer`（通常缩写为 BER）用于以[静态烘焙模型][model]（JSON、OBJ 等）无法表示的方式“渲染”[方块][block]。例如，它可以动态渲染类似箱子的方块所保存的物品栏内容。即使方块本身不保存任何数据，只要使用方块实体渲染器，该方块也必须拥有 [`BlockEntity`][blockentity]。


BER 直接实现 `BlockEntityRenderer`，并提交需要渲染的[特性][features]：

```java
// 父接口中的泛型应设置为要渲染的方块实体类型，
// 以及提取出的渲染状态。详见下文。
public class MyBlockEntityRenderer implements BlockEntityRenderer<MyBlockEntity, MyBlockEntityRenderState> {

    public MyBlockEntityRenderer(BlockEntityRendererProvider.Context context) {
        // 从 context 中取得所需内容
    }

    // 告诉渲染器如何创建新的渲染状态。
    @Override
    public MyBlockEntityRenderState createRenderState() {
        return new MyBlockEntityRenderState();
    }

    // 把传入方块实体中需要的值复制到传入的渲染状态，从而更新渲染状态。
    // 方块实体和渲染状态就是传给渲染器的泛型类型。
    @Override
    public void extractRenderState(MyBlockEntity blockEntity, MyBlockEntityRenderState renderState, float partialTick, Vec3 cameraPos, @Nullable ModelFeatureRenderer.CrumblingOverlay crumblingOverlay) {
        // 始终调用 super 或 `BlockEntityRenderState#extractBase`
        super.extractRenderState(blockEntity, renderState, partialTick, cameraPos, crumblingOverlay);

        // 在这里提取并保存其他需要放入状态的值。
        renderState.value = blockEntity.getValue();
    }

    // 实际提交方块实体的渲染特性。
    // 第一个参数与渲染状态的泛型类型一致。
    @Override
    public void submit(MyBlockEntityRenderState renderState, PoseStack poseStack, SubmitNodeCollector collector, CameraRenderState cameraState) {
        // 在这里通过 collector 提交渲染内容。
    }
}
```

创建 BER 后，还需要把它注册并连接到所属方块实体。这通过 [`EntityRenderersEvent.RegisterRenderers`][event]完成：

```java
@SubscribeEvent // 在物理客户端的模组事件总线上
public static void registerEntityRenderers(EntityRenderersEvent.RegisterRenderers event) {
    event.registerBlockEntityRenderer(
            // 要为其注册渲染器的方块实体类型。
            MyBlockEntities.MY_BLOCK_ENTITY.get(),
            // 从 BlockEntityRendererProvider.Context 到 BlockEntityRenderer 的函数。
            MyBlockEntityRenderer::new
    );
}
```

:::note

如果 BER 不需要提供器上下文，也可以删除构造方法：

```java
public class MyBlockEntityRenderer implements BlockEntityRenderer<MyBlockEntity, MyBlockEntityRenderState> {

    // ...
}

// 位于某个事件处理器类中
@SubscribeEvent // 在物理客户端的模组事件总线上
public static void registerEntityRenderers(EntityRenderersEvent.RegisterRenderers event) {
    event.registerBlockEntityRenderer(MyBlockEntities.MY_BLOCK_ENTITY.get(),
            // 忽略上下文并调用空（默认）构造方法
            context -> new MyBlockEntityRenderer()
    );
}
```

:::

## 方块实体渲染状态

如上一节所述，方块实体渲染状态用于从实际方块实体的值中提取渲染所需的数据。它们在功能上是继承 `BlockEntityRenderState` 的可变数据存储对象：

```java
public class MyBlockEntityRenderState extends BlockEntityRenderState {
    public boolean value;
}
```

随后应在 `BlockEntityRenderer#extractRenderState` 中从 `BlockEntity` 子类填充这些值。

## 物品形式的方块渲染

并非所有带渲染器的方块实体都能用静态物品模型表示，因此可以创建特殊渲染器来更动态地控制这个过程。这通过 [`SpecialModelRenderer`][special]实现。此时既需要创建特殊模型渲染器来提交所需[特性][features]，也需要为方块本身被提交渲染的场景注册对应的特殊方块模型渲染器，例如末影人拿着方块时的场景。

更多信息请参阅[客户端物品文档][special]。

[block]: ../blocks/index.md
[blockentity]: index.md
[event]: ../concepts/events.md#registering-an-event-handler
[features]: ../rendering/feature.md
[item]: ../items/index.md
[model]: ../resources/client/models/index.md
[special]: ../resources/client/models/items.md#special-models
