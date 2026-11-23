---
sidebar_position: 3
---
# 消耗品

消耗品是能够持续使用一段时间，并在过程中被“消耗”的[物品][item]。Minecraft 中可以吃喝的东西都属于某种消耗品。

## `Consumable` 数据组件

任何能够被消耗的物品都拥有 [`DataComponents#CONSUMABLE` 组件][datacomponent]。其底层 record `Consumable` 定义物品的使用方式，以及使用完成后应用的效果。

`Consumable` 可以直接调用 record 构造方法创建，也可以通过 `Consumable#builder` 创建；构建器会为每个字段设置默认值，完成后调用 `build`：

- `consumeSeconds`：一个 `float`，表示完全消耗物品所需的秒数。经过该时间后调用 `Item#finishUsingItem`。默认 1.6 秒，即 32 个 tick。
- `animation`：设置使用物品时播放的 [`ItemUseAnimation`][animation]。默认为 `ItemUseAnimation#EAT`。
- `sound`：设置消耗物品时播放的 [`SoundEvent`][sound]。必须是 `Holder` 实例，默认为 `SoundEvents#GENERIC_EAT`。
    - 如果原版实例不是 `Holder<SoundEvent>`，可以调用 `BuiltInRegistries.SOUND_EVENT.wrapAsHolder(soundEvent)` 取得包装后的 `Holder`。
- `soundAfterConsume`：设置物品完全消耗后播放的 [`SoundEvent`][sound]。该设置委托给 [`PlaySoundConsumeEffect`][consumeeffect]。
- `hasConsumeParticles`：为 `true` 时，每四个 tick 以及物品完全消耗时生成物品[粒子][particles]。默认为 `true`。
- `onConsume`：添加一个 [`ConsumeEffect`][consumeeffect]，在物品通过 `Item#finishUsingItem` 完全消耗后应用。

原版在 `Consumables` 类中提供了一些消耗品，例如[食物][food]使用的 `#defaultFood`，以及[药水][potions]和奶桶使用的 `#defaultDrink`。

可以通过调用 `Item.Properties#component` 添加 `Consumable` 组件：

```java
// 假设存在某个 DeferredRegister.Items ITEMS
public static final DeferredItem<Item> CONSUMABLE = ITEMS.registerSimpleItem(
    "consumable",
    props -> props.component(
        DataComponents.CONSUMABLE,
        Consumable.builder()
            // 花 2 秒，即 40 个 tick 消耗
            .consumeSeconds(2f)
            // 设置消耗时播放的动画
            .animation(ItemUseAnimation.BLOCK)
            // 消耗期间每个 tick 播放声音
            .sound(SoundEvents.ARMOR_EQUIP_CHAIN)
            // 完成消耗后播放一次声音
            .soundAfterConsume(SoundEvents.BREEZE_WIND_CHARGE_BURST)
            // 食用时不显示粒子
            .hasConsumeParticles(false)
            .onConsume(
                // 完成消耗时，以 30% 概率应用效果
                new ApplyStatusEffectsConsumeEffect(new MobEffectInstance(MobEffects.HUNGER, 600, 0), 0.3F)
            )
            // 可以添加多个
            .onConsume(
                // 把实体随机传送到 50 格半径内
                new TeleportRandomlyConsumeEffect(100f)
            )
            .build()
    )
);
```

### `ConsumeEffect`

消耗品使用完成后，可能需要执行某种逻辑，例如添加药水效果。这些逻辑由 `ConsumeEffect` 处理，并通过 `Consumable.Builder#onConsume` 加入 `Consumable`。

原版效果列表可在 `ConsumeEffect` 中查看。

每个 `ConsumeEffect` 都有两个方法：`getType` 指定注册表对象 `ConsumeEffect.Type`；`apply` 在物品完全消耗后调用。`apply` 接收三个参数：使用实体所在 `Level`、调用消耗品的 `ItemStack` 以及消耗物品的 `LivingEntity`。效果成功应用时返回 `true`，失败时返回 `false`。

实现该接口并把 `ConsumeEffect.Type` 及其 `MapCodec`、`StreamCodec` [注册][registering]到 `BuiltInRegistries#CONSUME_EFFECT_TYPE`，即可创建 `ConsumeEffect`：

```java
public record UsePortalConsumeEffect(ResourceKey<Level> level)
    implements ConsumeEffect, Portal {

    @Override
    public boolean apply(Level level, ItemStack stack, LivingEntity entity) {
        if (entity.canUsePortal(false)) {
            entity.setAsInsidePortal(this, entity.blockPosition());

            // 成功使用传送门
            return true;
        }

        // 无法使用传送门
        return false;
    }

    @Override
    public ConsumeEffect.Type<? extends ConsumeEffect> getType() {
        // 设为已注册对象
        return USE_PORTAL.get();
    }

    @Override
    @Nullable
    public TeleportTransition getPortalDestination(ServerLevel level, Entity entity, BlockPos pos) {
        // 设置传送位置
    }
}

// 位于某个注册类中
// 假设存在某个 DeferredRegister<ConsumeEffect.Type<?>> CONSUME_EFFECT_TYPES
public static final Supplier<ConsumeEffect.Type<UsePortalConsumeEffect>> USE_PORTAL =
    CONSUME_EFFECT_TYPES.register("use_portal", () -> new ConsumeEffect.Type<>(
        ResourceKey.codec(Registries.DIMENSION).optionalFieldOf("dimension")
            .xmap(UsePortalConsumeEffect::new, UsePortalConsumeEffect::level),
        ResourceKey.streamCodec(Registries.DIMENSION)
            .map(UsePortalConsumeEffect::new, UsePortalConsumeEffect::level)
    ));

// 位于某个添加 CONSUMABLE 组件的 Item.Properties 中
Consumable.builder()
    .onConsume(
        new UsePortalConsumeEffect(Level.END)
    )
    .build();
```

### `ItemUseAnimation` {#itemuseanimation}

`ItemUseAnimation` 在功能上是一个枚举，除了 ID 和名称外不定义其他内容。第一人称用途硬编码在 `ItemHandRenderer#renderArmWithItem` 中，第三人称用途硬编码在 `AvatarRenderer#getArmPose` 中。因此，单纯创建新的 `ItemUseAnimation` 时，效果只会与 `ItemUseAnimation#NONE` 相同。

要应用动画，需要为第一人称实现 `IClientItemExtensions#applyForgeHandTransform`，并为第三人称渲染实现 `IClientItemExtensions#getArmPose`。

#### 创建 `ItemUseAnimation`

首先通过[可扩展枚举][extensibleenum]系统创建新的 `ItemUseAnimation`：

```json5
{
    "entries": [
        {
            "enum": "net/minecraft/world/item/ItemUseAnimation",
            "name": "EXAMPLEMOD_ITEM_USE_ANIMATION",
            "constructor": "(ILjava/lang/String;)V",
            "parameters": [
                // ID 应始终为 -1
                -1,
                // 名称应为唯一标识符
                "examplemod:item_use_animation"
            ]
        }
    ]
}
```

随后通过 `valueOf` 取得枚举常量：

```java
public static final ItemUseAnimation EXAMPLE_ANIMATION = ItemUseAnimation.valueOf("EXAMPLEMOD_ITEM_USE_ANIMATION");
```

接着就可以应用变换。首先创建新的 `IClientItemExtensions`，实现所需方法，并在[**模组事件总线**][modbus]上通过 `RegisterClientExtensionsEvent` 注册：

```java
public class ConsumableClientItemExtensions implements IClientItemExtensions {
    // 在这里实现方法
}

// 位于某个事件处理器类中
@SubscribeEvent // 在物理客户端的模组事件总线上
public static void registerClientExtensions(RegisterClientExtensionsEvent event) {
    event.registerItem(
        // 物品扩展实例
        new ConsumableClientItemExtensions(),
        // 使用该扩展的物品可变参数
        CONSUMABLE
    )
}
```

#### 第一人称

所有消耗品都支持的第一人称变换通过 `IClientItemExtensions#applyForgeHandTransform` 实现：

```java
public class ConsumableClientItemExtensions implements IClientItemExtensions {

    // ...

    @Override
    public boolean applyForgeHandTransform(
        PoseStack poseStack, LocalPlayer player, HumanoidArm arm, ItemStack itemInHand,
        float partialTick, float equipProcess, float swingProcess
    ) {
        // 首先检查物品是否正在使用，并且具有我们的动画
        HumanoidArm usingArm = entity.getUsedItemHand() == InteractionHand.MAIN_HAND
            ? entity.getMainArm()
            : entity.getMainArm().getOpposite();
        if (
            entity.isUsingItem() && entity.getUseItemRemainingTicks() > 0
            && usingArm == arm && itemInHand.getUseAnimation() == EXAMPLE_ANIMATION
        ) {
            // 对 pose stack 应用变换（translate、scale、mulPose）
            // ...
            return true;
        }

        // 不执行操作
        return false;
    }
}
```

#### 第三人称

除 `EAT` 和 `DRINK` 外，所有第三人称变换都有特殊逻辑，通过 `IClientItemExtensions#getArmPose` 实现。也可以扩展 `HumanoidModel.ArmPose` 来创建自定义变换。

由于 `ArmPose` 构造方法需要 lambda，必须使用 `EnumProxy` 引用：

```json5
{
    "entries": [
        {
            "name": "EXAMPLEMOD_ITEM_USE_ANIMATION",
            // ...
        },
        {
            "enum": "net/minecraft/client/model/HumanoidModel$ArmPose",
            "name": "EXAMPLEMOD_ARM_POSE",
            "constructor": "(ZLnet/neoforged/neoforge/client/IArmPoseTransformer;)V",
            "parameters": {
                // 指向 proxy 所在的类
                // 应单独放置，因为它是仅客户端类
                "class": "example/examplemod/client/MyClientEnumParams",
                // 枚举 proxy 的字段名
                "field": "CUSTOM_ARM_POSE"
            }
        }
    ]
}
```

```java
// 创建枚举参数
public class MyClientEnumParams {
    public static final EnumProxy<HumanoidModel.ArmPose> CUSTOM_ARM_POSE = new EnumProxy<>(
        HumanoidModel.ArmPose.class,
        // 姿势是否使用双臂
        false,
        // 副手位置是否应受模型姿势影响
        false,
        // 姿势变换器
        (IArmPoseTransformer) MyClientEnumParams::applyCustomModelPose
    );

    private static void applyCustomModelPose(
        HumanoidModel<?> model, HumanoidRenderState state, HumanoidArm arm
    ) {
        // 在这里应用模型变换
        // ...
    }
}

// 位于某个仅客户端类中
public static final HumanoidModel.ArmPose EXAMPLE_POSE = HumanoidModel.ArmPose.valueOf("EXAMPLEMOD_ARM_POSE");
```

然后通过 `IClientItemExtensions#getArmPose` 设置手臂姿势：

```java
public class ConsumableClientItemExtensions implements IClientItemExtensions {

    // ...

    @Override
    public HumanoidModel.ArmPose getArmPose(
        LivingEntity entity, InteractionHand hand, ItemStack stack
    ) {
        // 首先检查物品是否正在使用，并且具有我们的动画
        if (
            entity.isUsingItem() && entity.getUseItemRemainingTicks() > 0
            && entity.getUsedItemHand() == hand
            && itemInHand.getUseAnimation() == EXAMPLE_ANIMATION
        ) {
            // 返回要应用的姿势
            return EXAMPLE_POSE;
        }

        // 否则返回 null
        return null;
    }
}
```

### 覆盖实体播放的声音

实体消耗物品时，有时需要播放不同声音。此时 [`LivingEntity`][livingentity] 实例可以实现 `Consumable.OverrideConsumeSound`，并让 `getConsumeSound` 返回该实体要播放的 `SoundEvent`。

```java
public class MyEntity extends LivingEntity implements Consumable.OverrideConsumeSound {

    // ...

    @Override
    public SoundEvent getConsumeSound(ItemStack stack) {
        // 返回要播放的声音
    }
}
```

## `ConsumableListener`

消耗品和消耗后应用的效果很有用，但有时效果属性还需要作为其他[数据组件][datacomponents]供外部访问。例如，猫和狼也会吃[食物][food]并查询营养价值，或者带药水内容的物品会查询颜色用于渲染。此时可以令数据组件实现 `ConsumableListener` 来提供消耗逻辑。

`ConsumableListener` 只有一个方法 `#onConsume`，接收当前世界、消耗物品的实体、被消耗的物品以及物品上的 `Consumable` 实例。物品完全消耗后，`Item#finishUsingItem` 会调用 `onConsume`。

添加自定义 `ConsumableListener` 只需[注册新的数据组件][datacompreg]并实现该接口：

```java
public record MyConsumableListener() implements ConsumableListener {

    @Override
    public void onConsume(
        Level level, LivingEntity entity, ItemStack stack, Consumable consumable
    ) {
        // 在这里执行操作
    }
}
```

### 食物 {#food}

食物是饥饿系统使用的一种 `ConsumableListener`。食物物品的全部功能已经在 `Item` 类中处理，因此只需把 `FoodProperties` 加入 `DataComponents#FOOD` 并添加消耗品。辅助方法 `food` 接收 `FoodProperties` 和 `Consumable`；如果未指定消耗品，则使用 `Consumables#DEFAULT_FOOD`。

`FoodProperties` 可以直接调用 record 构造方法创建，也可以通过 `new FoodProperties.Builder()` 创建，完成后调用 `build`：

- `nutrition`：设置恢复的饥饿点数。以半个饥饿点计数，例如 Minecraft 的牛排恢复 8 个饥饿点。
- `saturationModifier`：计算食用该食物恢复的[饱和度][hunger]时使用的饱和度修饰符。计算公式为 `min(2 * nutrition * saturationModifier, playerNutrition)`，因此 `0.5` 会使有效饱和值与营养价值相等。
- `alwaysEdible`：设置饥饿条已满时能否继续食用。默认为 `false`；金苹果等除了恢复饥饿值外还提供奖励的物品为 `true`。

```java
// 假设存在某个 DeferredRegister.Items ITEMS
public static final DeferredItem<Item> FOOD = ITEMS.registerSimpleItem(
    "food",
    props -> props.food(
        new FoodProperties.Builder()
            // 恢复 1.5 颗心
            .nutrition(3)
            // 胡萝卜为 0.3
            // 生鳕鱼为 0.1
            // 熟鸡肉为 0.6
            // 熟牛肉为 0.8
            // 金苹果为 1.2
            .saturationModifier(0.3f)
            // 设置后，即使饥饿条已满也可以继续食用。
            .alwaysEdible()
    )
);
```

示例和 Minecraft 使用的各种值可参考 `Foods` 类。

要取得物品的 `FoodProperties`，调用 `ItemStack.get(DataComponents.FOOD)`。由于并非所有物品都可食用，返回值可能为 null；可通过检查 `getFoodProperties` 的返回值是否为 null 来判断物品是否可食用。

### 药水内容

通过 `PotionContents` 表示的[药水][potions]内容也是一种 `ConsumableListener`，其效果在消耗时应用。它包含可选的药水、可选的药水颜色着色值、与药水一起应用的自定义 [`MobEffectInstance`][mobeffectinstance]列表，以及取得物品堆名称时使用的可选翻译键。如果不是 `PotionItem` 子类，模组作者需要重写 `Item#getName`。

[animation]: #itemuseanimation
[consumeeffect]: #consumeeffect
[datacomponent]: datacomponents.md
[datacompreg]: datacomponents.md#creating-custom-data-components
[extensibleenum]: ../advanced/extensibleenums.md
[food]: #food
[hunger]: https://minecraft.wiki/w/Hunger#Mechanics
[item]: index.md
[livingentity]: ../entities/livingentity.md
[modbus]: ../concepts/events.md#event-buses
[mobeffectinstance]: mobeffects.md#mobeffectinstances
[particles]: ../resources/client/particles.md
[potions]: mobeffects.md#potions
[sound]: ../resources/client/sounds.md#creating-soundevents
[registering]: ../concepts/registries.md#methods-for-registering
