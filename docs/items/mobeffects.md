---
sidebar_position: 6
---
# 生物效果与药水

状态效果有时也称为药水效果，在代码中称为 `MobEffect`，是每个 tick 影响 [`LivingEntity`][livingentity] 的效果。本文介绍其用法、效果与药水的区别，以及如何添加自定义内容。

## 术语

- `MobEffect` 每个 tick 影响实体。与[方块][block]或[物品][item]一样，`MobEffect` 是注册表对象，必须[注册][registration]，并且是单例。
    - **瞬间生物效果**是一种特殊生物效果，设计为只应用一个 tick。原版有两个瞬间效果：瞬间治疗和瞬间伤害。
- `MobEffectInstance` 是 `MobEffect` 的实例，带有持续时间、amplifier 等属性（见下文）。`MobEffectInstance` 与 `MobEffect` 的关系，相当于 [`ItemStack`][itemstack] 与 `Item` 的关系。
- `Potion` 是一组 `MobEffectInstance`。原版主要把药水用于四种药水物品（见下文），但药水可以随意设置到任何物品上；物品是否使用、以及如何使用设置在其上的药水，由物品自行决定。
- **药水物品**指设计为带有药水的物品。这是非正式术语，与原版 `PotionItem` 类无关（该类指“普通”药水物品）。Minecraft 当前有四种药水物品：药水、喷溅药水、滞留药水和药箭；模组可以添加更多种类。

## `MobEffect`

要创建自定义 `MobEffect`，继承 `MobEffect` 类：

```java
public class MyMobEffect extends MobEffect {
    public MyMobEffect(MobEffectCategory category, int color) {
        super(category, color);
    }

    @Override
    public boolean applyEffectTick(ServerLevel level, LivingEntity entity, int amplifier) {
        // 在这里应用效果逻辑。

        // 如果 shouldApplyEffectTickThisTick 返回 true 时此方法返回 false，效果会立即移除
        return true;
    }

    // 效果是否应在当前 tick 应用。例如，生命恢复效果只在某些 tick 应用，
    // 具体取决于 tick 计数和 amplifier。
    @Override
    public boolean shouldApplyEffectTickThisTick(int tickCount, int amplifier) {
        return tickCount % 2 == 0; // 替换为需要的检查
    }

    // 效果首次加入实体时调用的工具方法。
    // 只有实体上该效果的所有实例都被移除后，再次添加时才会再次调用。
    @Override
    public void onEffectAdded(LivingEntity entity, int amplifier) {
        super.onEffectAdded(entity, amplifier);
    }

    // 效果加入实体时调用的工具方法。
    // 每次把该效果加入实体时都会调用。
    @Override
    public void onEffectStarted(LivingEntity entity, int amplifier) {
    }
}
```

与所有注册表对象一样，`MobEffect` 必须[注册][registration]：

```java
// MOB_EFFECTS 是一个 DeferredRegister<MobEffect>
public static final Holder<MobEffect> MY_MOB_EFFECT = MOB_EFFECTS.register("my_mob_effect", () -> new MyMobEffect(
        // 可为 BENEFICIAL、NEUTRAL 或 HARMFUL，用于决定药水提示框的颜色。
        MobEffectCategory.BENEFICIAL,
        // 效果粒子的 RGB 颜色。
        0xffffff
));
```

`MobEffect` 类还提供默认功能，可以给受影响实体添加[属性修饰符][attributemodifier]，并在效果到期或因其他原因移除时删除修饰符。例如速度效果会添加移动速度属性修饰符。效果属性修饰符的添加方式如下：

```java
public static final Holder<MobEffect> MY_MOB_EFFECT = MOB_EFFECTS.register("my_mob_effect", () -> new MyMobEffect(...)
        .addAttributeModifier(Attributes.ATTACK_DAMAGE, Identifier.fromNamespaceAndPath("examplemod", "effect.strength"), 2.0, AttributeModifier.Operation.ADD_VALUE)
);
```

### `InstantenousMobEffect`

要创建瞬间效果，可以使用辅助类 `InstantenousMobEffect`，而不是普通 `MobEffect`：

```java
public class MyMobEffect extends InstantenousMobEffect {
    public MyMobEffect(MobEffectCategory category, int color) {
        super(category, color);
    }

    @Override
    public void applyEffectTick(ServerLevel level, LivingEntity entity, int amplifier) {
        // 在这里应用效果逻辑。
    }
}
```

然后像普通效果一样[注册][registration]即可。

### 事件

许多效果的功能会在其他位置应用。例如飘浮效果在生物实体移动处理器中应用。对于模组 `MobEffect`，通常适合在[事件处理器][events]中实现。NeoForge 还提供一些效果相关事件：

- 游戏检查能否把 `MobEffectInstance` 应用到实体时，触发 `MobEffectEvent.Applicable`。该事件可用于拒绝或强制把效果实例加入目标。
- 把 `MobEffectInstance` 加入目标时，触发 `MobEffectEvent.Added`。事件包含目标此前可能存在的 `MobEffectInstance` 信息。
- `MobEffectInstance` 到期（计时器归零）时，触发 `MobEffectEvent.Expired`。
- 效果因到期以外的方式从实体移除时（例如喝奶或使用命令），触发 `MobEffectEvent.Remove`。

## `MobEffectInstance` {#mobeffectinstances}

简单来说，`MobEffectInstance` 是应用到实体上的一个效果。调用构造方法创建：

```java
MobEffectInstance instance = new MobEffectInstance(
        // 使用的生物效果。
        MobEffects.REGENERATION,
        // 持续时间，单位为 tick。未指定时默认为 0。
        500,
        // 使用的 amplifier，表示效果“强度”，例如力量 I、力量 II。
        // 必须为 0 到 255（含边界）。未指定时默认为 0。
        0,
        // 是否为“环境”效果，即由环境来源施加。
        // Minecraft 当前的环境来源包括信标和潮涌核心。未指定时默认为 false。
        false,
        // 效果是否在物品栏中可见。未指定时默认为 true。
        true,
        // 右上角是否显示效果图标。未指定时默认为 true。
        true
);
```

还提供多个构造方法重载，分别省略最后 1 到 5 个参数。

:::info
`MobEffectInstance` 是可变的。如果需要副本，请调用 `new MobEffectInstance(oldInstance)`。
:::

### 使用 `MobEffectInstance`

可以这样把 `MobEffectInstance` 加入 `LivingEntity`：

```java
MobEffectInstance instance = new MobEffectInstance(...);
livingEntity.addEffect(instance);
```

同样，也可以从 `LivingEntity` 移除。由于一个 `MobEffectInstance` 会覆盖实体上同一 `MobEffect` 的既有实例，因此每个 `MobEffect` 在每个实体上最多只有一个 `MobEffectInstance`。所以移除时只需指定 `MobEffect`：

```java
livingEntity.removeEffect(MobEffects.REGENERATION);
```

:::info
`MobEffect` 只能应用于 `LivingEntity` 及其子类，例如玩家和生物。物品或被投掷的雪球等对象不能受到 `MobEffect` 影响。
:::

## `Potion` {#potions}

调用 `Potion` 构造方法并传入所需的 `MobEffectInstance` 来创建药水。例如：

```java
//POTIONS 是一个 DeferredRegister<Potion>
public static final Holder<Potion> MY_POTION = POTIONS.register("my_potion", registryName -> new Potion(
    // 应用于药水名称的后缀
    registryName.getPath(),
    // 药水使用的效果
    new MobEffectInstance(MY_MOB_EFFECT, 3600)
));
```

药水名称是构造方法的第一个参数，用作翻译键后缀。例如，原版的长效和强效药水变体借此与基础变体使用相同名称。

`new Potion` 的 `MobEffectInstance` 参数是可变参数，因此可以给药水添加任意多个效果，也可以创建空药水，即不含任何效果的药水。只需调用 `new Potion()` 即可；原版 `awkward` 药水就是这样添加的。

`PotionContents` 类提供各种与药水物品相关的辅助方法。药水物品通过 `DataComponent#POTION_CONTENTS` 保存 `PotionContents`。

### 酿造

药水添加完成后，药水物品已经可以使用该药水，但生存模式中还没有获得它的方法。药水传统上通过酿造台制作。由于 Mojang 没有为酿造配方提供[数据包][datapack]支持，需要通过 `RegisterBrewingRecipesEvent` 事件用代码添加配方：

```java
@SubscribeEvent // 在游戏事件总线上
public static void registerBrewingRecipes(RegisterBrewingRecipesEvent event) {
    // 取得用于添加配方的构建器
    PotionBrewing.Builder builder = event.getBuilder();

    // 为所有容器类药水（例如药水、喷溅药水、滞留药水）添加酿造配方
    builder.addMix(
        // 初始应用的药水
        Potions.AWKWARD,
        // 酿造材料，即酿造台顶部的物品
        Items.FEATHER,
        // 结果药水
        MY_POTION
    );
}
```

[attributemodifier]: ../entities/attributes.md#attribute-modifiers
[block]: ../blocks/index.md
[commonsetup]: ../concepts/events.md#event-buses
[datapack]: ../../26.1/resources/index.md#data
[events]: ../concepts/events.md
[item]: index.md
[itemstack]: index.md#itemstacks
[livingentity]: ../entities/livingentity.md
[registration]: ../concepts/registries.md#methods-for-registering
[uuidgen]: https://www.uuidgenerator.net/version4
