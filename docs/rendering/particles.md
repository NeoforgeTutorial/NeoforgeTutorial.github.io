# 客户端粒子 {#client-particles}

粒子是用于提升游戏表现和沉浸感的视觉效果。它们主要只涉及显示，因此关键部分只存在于物理（以及逻辑）客户端[端][side]。

本文介绍粒子与渲染相关的内容。关于通常负责生成粒子的粒子类型，以及可以指定粒子精灵的粒子描述，请参阅配套的[粒子类型][particletype]文章。

## `Particle` 类 {#the-particle-class}

`Particle` 定义世界中生成并向玩家显示的内容在客户端上的表示。大多数属性和基础物理行为通过 `gravity`、`lifetime`、`hasPhysics`、`friction` 等字段控制。通常只需重写 `tick` 和 `move` 两个方法，它们的作用与名称一致。因此，大多数自定义粒子都很简短，往往只包含设置字段的构造函数，偶尔再重写这两个方法。

构造粒子的两种常见方式是：继承 `SingleQuadParticle` 的某个实现（例如 `SimpleAnimatedParticle`），把面向观察者的纹理绘制到屏幕；或者直接继承 `Particle`，完全控制提交的渲染[特性][features]。

## 单个四边形 {#a-single-quad}

继承 `SingleQuadParticle` 的粒子会使用某个图集精灵，在屏幕上绘制一个四边形。该类提供了许多辅助方法，例如通过 `quadSize` 字段或 `scale` 方法设置大小，通过 `setColor` 和 `setAlpha` 调整纹理着色。对于四边形粒子，最重要的两项是作为纹理的 `TextureAtlasSprite`，以及该精灵由哪个 `SingleQuadParticle.Layer` 获取和渲染。

首先，`TextureAtlasSprite` 会在构造时传入，可以直接传入精灵本身，但更常见的是传入表示整个生命周期纹理的 `SpriteSet`。初始精灵会赋给受保护字段 `sprite`，之后可以在 `tick` 中调用 `setSprite` 或 `setSpriteFromAge` 更新。

:::tip
如果在粒子构造函数中修改了 `age` 或 `lifetime` 字段，应调用 `setSpriteFromAge` 显示对应的纹理。
:::

接下来，在[特性提交过程][features]中，`SingleQuadParticle.Layer` 会决定使用哪个图集，以及用哪条渲染管线把四边形绘制到屏幕。原版默认提供六种层：

| 层 | 纹理图集 | 用途 |
|:--:|:--------:|------|
| `OPAQUE_TERRAIN` | 方块 | 使用不透明方块纹理的粒子 |
| `TRANSLUCENT_TERRAIN` | 方块 | 使用半透明方块纹理的粒子 |
| `OPAQUE_ITEMS` | 物品 | 使用不透明物品纹理的粒子 |
| `TRANSLUCENT_ITEMS` | 物品 | 使用半透明物品纹理的粒子 |
| `OPAQUE` | 粒子 | 不透明粒子 |
| `TRANSLUCENT` | 粒子 | 半透明粒子 |

为方便使用，如果采用原版层，可以调用 `SingleQuadParticle.Layer#bySprite` 并传入纹理，由它判断粒子应使用哪一层。

自定义层可以直接通过构造函数创建：

```java
public class MyQuadParticle extends SingleQuadParticle {

    public static final SingleQuadParticle.Layer EXAMPLE_LAYER = new SingleQuadParticle.Layer(
        // 粒子是否包含并非完全不透明的纹理。
        true,
        // 用于取得精灵的纹理图集。
        // 应与 `TextureAtlasSprite#atlasLocation` 相同。
        TextureAtlas.LOCATION_PARTICLES,
        // 用于绘制粒子的渲染管线。
        // 自定义渲染管线应基于 `RenderPipelines#PARTICLE_SNIPPET`，
        // 以指定可用的 uniform 和 sampler。
        RenderPipelines.WEATHER_DEPTH_WRITE
    );

    private final SpriteSet spriteSet;

    // 前四个参数含义很直观。
    // 精灵集或图集精灵通常由提供器传入，见下文。
    // 可以按需增加参数，例如 xSpeed/ySpeed/zSpeed。
    public MyQuadParticle(ClientLevel level, double x, double y, double z, SpriteSet spriteSet) {
        // 在构造函数中设置初始精灵。
        super(level, x, y, z, spriteSet.first());
        this.spriteSet = spriteSet;
        this.gravity = 0; // 让粒子悬浮在空中，没什么不可以。
    }

    @Override
    public void tick() {
        // 交给父类处理移动。
        // 如有需要，可以替换为自己的移动逻辑。
        // 如果只想修改内置移动逻辑，也可以重写 move()。
        super.tick();

        // 根据当前粒子年龄设置精灵，也就是推进动画。
        this.setSpriteFromAge(this.spriteSet);
    }

    @Override
    protected abstract SingleQuadParticle.Layer getLayer() {
        // 设置用于取得并提交纹理的层。
        return EXAMPLE_LAYER;
    }
}
```

:::warning
如果粒子的 `SingleQuadParticle.Layer` 使用 `TextureAtlas#LOCATION_PARTICLES`，该粒子就必须具有对应的[粒子描述][description]。否则，粒子所需的纹理不会加入图集。
:::

## 粒子组与渲染状态 {#particle-groups-and-render-states}

如果粒子比一个四边形更复杂，就需要使用自己的 `ParticleGroup<P>`，其中 `P` 是 `Particle` 的类型。`ParticleGroup` 负责更新指定的一组 `Particle`，并在 `Particle#isAlive` 返回 `false` 时移除粒子。每个组最多可排队 16,384 个粒子，达到上限后会移除最旧的粒子。

```java
// 假设有如下粒子类
public class ComplexParticle extends Particle {

    // 不必使用这些字段，也不必存储这些值。
    // 需要自行决定要渲染的内容，并取得对应数据。
    private final Model.Simple model;
    private final SpriteId sprite;

    public ComplexParticle(ClientLevel level, double x, double y, double z) {
        super(level, x, y, z);
        this.model = StandingSignRenderer.createSignModel(
            Minecraft.getInstance().getEntityModels(), WoodType.OAK, PlainSignBlock.Attachment.GROUND
        );
        this.sprite = Sheets.getSignSprite(WoodType.OAK);
    }

    public Model.Simple model() {
        return this.model;
    }

    public SpriteId sprite() {
        return this.sprite;
    }
}

// 可以这样创建基础粒子组
public class ComplexParticleGroup extends ParticleGroup<ComplexParticle> {

    public ComplexParticleGroup(ParticleEngine engine) {
        super(engine);
    }

    // ...
}
```

`Particle` 加入 `ParticleGroup` 后，会在[特性提交][features]期间通过 `ParticleGroup#extractRenderState` 提取为 `ParticleGroupRenderState`。`ParticleGroupRenderState` 同时充当包含提取粒子的渲染状态，以及通过 `#submit` 提交粒子元素进行渲染的处理器。

```java
// 粒子组渲染状态
public record ComplexParticleRenderState(List<ComplexParticleRenderState.Entry> entries) implements ParticleGroupRenderState {

    // 每个条目表示组中的一个粒子
    public record Entry(Model.Simple model, SpriteId sprite, PoseStack pose) {}

    @Override
    public void submit(SubmitNodeCollector collector, CameraRenderState camera) {
        // 提交要渲染的粒子元素
        for (ComplexParticleRenderState.Entry entry : this.entries) {
            collector.submitModel(...);
        }
    }
}

// 在粒子组中……
public class ComplexParticleGroup extends ParticleGroup<ComplexParticle> {

    // ...

    @Override
    public ParticleGroupRenderState extractRenderState(Frustum frustum, Camera camera, float partialTickTime) {
        // 从粒子中提取渲染状态
        List<ComplexParticleRenderState.Entry> entries = new ArrayList<>();

        for (ComplexParticle particle : this.particles) {
            PoseStack pose = new PoseStack();
            pose.pushPose();
            pose.mulPose(camera.rotation());
            entries.add(new ComplexParticleRenderState.Entry(particle.model(), particle.sprite(), pose));
        }

        return new ComplexParticleRenderState(entries);
    }
}
```

单独一个 `Particle` 并不知道自己属于哪个 `ParticleGroup`，`ParticleEngine` 也不知道该组是否存在。它们通过组 ID `ParticleRenderType` 关联起来。`ParticleRenderType` 需要通过[客户端][side]的[模组事件总线][modbus][事件][event] `RegisterParticleGroupsEvent` 与 `ParticleGroup` 关联。之后，粒子可以把 `Particle#getGroup` 设为该类型，从而使用对应粒子组。

```java
// 创建渲染类型
// 传入的字符串应为 `Identifier` 的字符串形式
public static final ParticleRenderType COMPLEX = new ParticleRenderType("examplemod:complex");

@SubscribeEvent // 仅在物理客户端上于模组事件总线触发
public static void registerParticleProviders(RegisterParticleGroupsEvent event) {
    // 把渲染类型关联到粒子组
    event.register(COMPLEX, ComplexParticleGroup::new);
}

public class ComplexParticle extends Particle {

    // ...

    @Override
    public ParticleRenderType getGroup() {
        // 告诉粒子使用该粒子组进行渲染
        return COMPLEX;
    }
}
```

## `ParticleProvider` {#particleprovider}

创建某种粒子类型对应的粒子后，还需要通过 `ParticleProvider` 把两者关联起来。`ParticleProvider` 是仅客户端类，负责在 `createParticle` 中根据 `ParticleEngine` 提供的信息实际创建 `Particle`。虽然这里可以编写复杂逻辑，但许多粒子提供器都很简单：

```java
// ParticleProvider 的泛型必须与此提供器对应的粒子类型一致。
public class MyQuadParticleProvider implements ParticleProvider<SimpleParticleType> {

    // 粒子精灵集。
    private final SpriteSet spriteSet;

    // 注册函数会传入 SpriteSet，因此接收并保存它以便之后使用。
    // 如果粒子不需要 SpriteSet，可以省略这个构造函数。
    public MyParticleProvider(SpriteSet spriteSet) {
        this.spriteSet = spriteSet;
    }

    // 实际创建粒子的位置。每次调用都会返回一个新粒子。
    // 第一个参数的类型与传入父接口的泛型类型一致。
    @Override
    @Nullable
    public Particle createParticle(SimpleParticleType particleType, ClientLevel level, double x, double y, double z, double xd, double yd, double zd, RandomSource random
    ) {
        // 这里不使用类型、速度增量和引擎随机数。
        return new MyQuadParticle(level, x, y, z, this.spriteSet);
    }
}
```

然后，必须在[客户端][side]的[模组事件总线][modbus][事件][event] `RegisterParticleProvidersEvent` 中，把粒子提供器关联到粒子类型：

```java
@SubscribeEvent // 仅在物理客户端上于模组事件总线触发
public static void registerParticleProviders(RegisterParticleProvidersEvent event) {
    // 有多种注册方式，区别在于第二个参数提供的函数类型。
    // 例如，registerSpriteSet 接收 Function<SpriteSet, ParticleProvider<?>>：
    event.registerSpriteSet(MyParticleTypes.MY_QUAD_PARTICLE.get(), MyQuadParticleProvider::new);

    // registerSpecial 则接收 ParticleProvider<?>。
    // 如果精灵不是从粒子描述中取得，就应使用这种方式。
}
```

:::warning
如果使用 `registerSpriteSet`，粒子类型还必须具有对应的[粒子描述][description]。否则会抛出“Failed to load description”异常。
:::

[description]: ../resources/client/particles.md
[event]: ../concepts/events.md
[features]: feature.md
[modbus]: ../concepts/events.md#event-buses
[particletype]: ../resources/client/particles.md
[registry]: ../concepts/registries.md#methods-for-registering
[side]: ../concepts/sides.md
