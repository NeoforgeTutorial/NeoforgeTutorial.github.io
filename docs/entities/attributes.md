---
sidebar_position: 4
---
# 属性

属性是[生物实体][livingentity]的特殊字段，决定最大生命值、速度或盔甲等基础属性。所有属性都以 double 保存并自动同步。原版提供大量默认属性，也可以添加自定义属性。

由于历史实现，并非所有属性都适用于所有实体。例如恶魂会忽略飞行速度，跳跃强度只影响马而不影响玩家。

## 内置属性

### Minecraft

以下属性位于 `minecraft` 命名空间，其代码值可在 `Attributes` 类中找到。

| 名称 | 代码中 | 范围 | 默认值 | 用途 |
|------|--------|------|--------|------|
| `armor` | `ARMOR` | `[0,30]` | 0 | 实体的盔甲值。值 1 表示快捷栏上方半个胸甲图标。 |
| `armor_toughness` | `ARMOR_TOUGHNESS` | `[0,20]` | 0 | 实体的盔甲韧性。更多信息见 [Minecraft Wiki][wiki]上的[盔甲韧性][toughness]。 |
| `attack_damage` | `ATTACK_DAMAGE` | `[0,2048]` | 2 | 实体在没有任何武器或类似物品时的基础攻击伤害。 |
| `attack_knockback` | `ATTACK_KNOCKBACK` | `[0,5]` | 0 | 实体造成的额外击退。击退本身还有一个不由该属性表示的基础强度。 |
| `attack_speed` | `ATTACK_SPEED` | `[0,1024]` | 4 | 实体的攻击冷却。数值越高，冷却越长；设为 0 实际上会重新启用 1.9 之前的战斗机制。 |
| `block_break_speed` | `BLOCK_BREAK_SPEED` | `[0,1024]` | 1 | 实体挖掘方块的乘算速度修饰符。更多信息见[挖掘速度][miningspeed]。 |
| `block_interaction_range` | `BLOCK_INTERACTION_RANGE` | `[0,64]` | 4.5 | 实体可与方块交互的范围，单位为方块。 |
| `burning_time` | `BURNING_TIME` | `[0,1024]` | 1 | 实体着火后燃烧时长的倍率。 |
| `camera_distance` | `CAMERA_DISTANCE` | `[0,32]` | 4 | 第三人称、旁观或骑乘其他实体时，摄像机与实体的距离。 |
| `explosion_knockback_resistance` | `EXPLOSION_KNOCKBACK_RESISTANCE` | `[0,1]` | 0 | 实体的爆炸击退抗性。该值为比例：0 表示无抗性，0.5 表示一半抗性，1 表示完全抗性。 |
| `entity_interaction_range` | `ENTITY_INTERACTION_RANGE` | `[0,64]` | 3 | 实体可与其他实体交互的范围，单位为方块。 |
| `fall_damage_multiplier` | `FALL_DAMAGE_MULTIPLIER` | `[0,100]` | 1 | 实体受到摔落伤害的倍率。 |
| `flying_speed` | `FLYING_SPEED` | `[0,1024]` | 0.4 | 飞行速度倍率。并非所有飞行实体都实际使用它，例如恶魂会忽略。 |
| `follow_range` | `FOLLOW_RANGE` | `[0,2048]` | 32 | 实体把玩家作为目标或跟随玩家的距离，单位为方块。 |
| `gravity` | `GRAVITY` | `[1,1]` | 0.08 | 影响实体的重力，单位为方块每 tick 的平方。 |
| `jump_strength` | `JUMP_STRENGTH` | `[0,32]` | 0.42 | 实体的跳跃强度。值越高，跳得越高。 |
| `knockback_resistance` | `KNOCKBACK_RESISTANCE` | `[0,1]` | 0 | 实体的击退抗性。该值为比例：0 表示无抗性，0.5 表示一半抗性，1 表示完全抗性。 |
| `luck` | `LUCK` | `[-1024,1024]` | 0 | 实体的幸运值。抽取[战利品表][loottables]时用于增加抽取次数或修改结果物品品质。 |
| `max_absorption` | `MAX_ABSORPTION` | `[0,2048]` | 0 | 实体的最大伤害吸收值（黄色心）。值 1 表示半颗心。 |
| `max_health` | `MAX_HEALTH` | `[1,1024]` | 20 | 实体的最大生命值。值 1 表示半颗心。 |
| `mining_efficiency` | `MINING_EFFICIENCY` | `[0,1024]` | 0 | 所用工具适用时的挖掘速度加算修饰符。更多信息见[挖掘速度][miningspeed]。 |
| `movement_efficiency` | `MOVEMENT_EFFICIENCY` | `[0,1]` | 0 | 实体在灵魂沙等会减速的方块上行走时，线性插值应用的移动速度加成。 |
| `movement_speed` | `MOVEMENT_SPEED` | `[0,1024]` | 0.7 | 实体的移动速度。值越高，速度越快。 |
| `oxygen_bonus` | `OXYGEN_BONUS` | `[0,1024]` | 0 | 实体的氧气加成。值越高，开始溺水前能坚持越久。 |
| `safe_fall_distance` | `SAFE_FALL_DISTANCE` | `[-1024,1024]` | 3 | 实体的安全摔落距离，即不会受到摔落伤害的距离。 |
| `scale` | `SCALE` | `[0.0625,16]` | 1 | 实体渲染使用的缩放。 |
| `sneaking_speed` | `SNEAKING_SPEED` | `[0,1]` | 0.3 | 实体潜行时应用的移动速度倍率。 |
| `spawn_reinforcements` | `SPAWN_REINFORCEMENTS_CHANCE` | `[0,1]` | 0 | 僵尸生成其他僵尸的概率。仅在困难难度有效，普通及更低难度不会生成僵尸增援。 |
| `step_height` | `STEP_HEIGHT` | `[0,10]` | 0.6 | 实体的抬步高度，单位为方块。设为 1 时，玩家可以像走上台阶一样走上 1 格高的坎。 |
| `submerged_mining_speed` | `SUBMERGED_MINING_SPEED` | `[0,20]` | 0.2 | 实体在水下时的挖掘速度乘算修饰符。更多信息见[挖掘速度][miningspeed]。 |
| `sweeping_damage_ratio` | `SWEEPING_DAMAGE_RATIO` | `[0,1]` | 0 | 横扫攻击造成的伤害占主攻击伤害的比例：0 为无伤害，0.5 为一半伤害，1 为完全伤害。 |
| `tempt_range` | `TEMPT_RANGE` | `[0,2048]` | 10 | 实体可被物品引诱的范围，主要用于牛、猪等被动动物。 |
| `water_movement_efficiency` | `WATER_MOVEMENT_EFFICIENCY` | `[0,1]` | 0 | 实体在水下时应用的移动速度倍率。 |
| `waypoint_transmit_range` | `WAYPOINT_TRANSMIT_RANGE` | `[0,60000000]` | 0 | 实体可向某个路径点追踪器发送自身位置的范围。 |
| `waypoint_receive_range` | `WAYPOINT_RECEIVE_RANGE` | `[0,60000000]` | 0 | 实体可接收另一个发送器的范围。 |

:::warning
Mojang 设置的一些属性上限相当随意，盔甲上限 30 尤其明显。NeoForge 不修改这些上限，但可以安装模组修改。
:::

### NeoForge

以下属性位于 `neoforge` 命名空间，其代码值可在 `NeoForgeMod` 类中找到。

| 名称 | 代码中 | 范围 | 默认值 | 用途 |
|------|--------|------|--------|------|
| `creative_flight` | `CREATIVE_FLIGHT` | `[0,1]` | 0 | 决定实体的创造模式飞行是否启用（> 0）或禁用（<= 0）。 |
| `nametag_distance` | `NAMETAG_DISTANCE` | `[0,32]` | 32 | 实体名称标签可见的距离，单位为方块。 |
| `swim_speed` | `SWIM_SPEED` | `[0,1024]` | 1 | 实体在水下时应用的移动速度倍率，独立于 `minecraft:water_movement_efficiency`。 |

## 默认属性

创建 `LivingEntity` 时，必须为其注册一组默认属性。实体[生成][spawning]时会设置默认属性。默认属性通过 [`EntityAttributeCreationEvent`][event]注册：

```java
@SubscribeEvent // 在模组事件总线上
public static void createDefaultAttributes(EntityAttributeCreationEvent event) {
    event.put(
        // 实体类型。
        MY_ENTITY.get(),
        // AttributeSupplier。通常通过调用 LivingEntity#createLivingAttributes，
        // 设置值，再调用 #build 创建；也可以从头创建，
        // 示例见 LivingEntity#createLivingAttributes 源码。
        LivingEntity.createLivingAttributes()
            // 添加使用默认值的属性。
            .add(Attributes.MAX_HEALTH)
            // 添加使用非默认值的属性。
            .add(Attributes.MAX_HEALTH, 50)
            // 构建 AttributeSupplier。
            .build()
    );
}
```

:::tip
一些类提供 `LivingEntity#createLivingAttributes` 的专用版本。例如 `Monster` 类提供 `Monster#createMonsterAttributes`。
:::

某些场景（例如创建[自定义属性][custom]）需要向已有实体的 `AttributeSupplier` 添加属性。这通过 `EntityAttributeModificationEvent` 完成：

```java
@SubscribeEvent // 在模组事件总线上
public static void modifyDefaultAttributes(EntityAttributeModificationEvent event) {
    event.add(
        // 要为其添加属性的 EntityType。
        EntityType.VILLAGER,
        // 要加到 EntityType 的 Holder<Attribute>。也可以是自定义属性。
        Attributes.ARMOR,
        // 要添加的属性值。
        // 可以省略；省略时使用属性默认值。
        10.0
    );
    // 也可以检查某个 EntityType 是否已拥有指定属性。
    // 此例中，如果村民尚无盔甲属性，就添加它。
    if (!event.has(EntityType.VILLAGER, Attributes.ARMOR)) {
        event.add(...);
    }
}
```

注意，与其他一些注册表不同，存在自定义属性不会阻止原版客户端连接 NeoForge 服务端。原版客户端连接时只会收到 `minecraft` 命名空间中的属性。

## 查询属性

属性值保存在实体的 `AttributeMap` 中，它基本是 `Map<Attribute, AttributeInstance>`。属性实例与属性的关系类似物品堆与物品：属性是注册表单例，属性实例则是绑定到具体实体的具体属性对象。

可以通过 `LivingEntity#getAttributes` 取得实体的 `AttributeMap`，然后查询：

```java
// 取得属性映射。
AttributeMap attributes = livingEntity.getAttributes();
// 取得属性实例。如果实体没有该属性，可能为 null。
AttributeInstance instance = attributes.getInstance(Attributes.ARMOR);
// 取得属性值。如有需要，会回退到实体的默认值。
double value = attributes.getValue(Attributes.ARMOR);
// 也可以先检查属性是否存在。
if (attributes.hasAttribute(Attributes.ARMOR)) { ... }

// LivingEntity 也提供快捷方法：
AttributeInstance instance = livingEntity.getAttribute(Attributes.ARMOR);
double value = livingEntity.getAttributeValue(Attributes.ARMOR);
```

:::info
处理属性时几乎总是使用 `Holder<Attribute>`，而不是 `Attribute`。这也是自定义属性下文会明确保存 `Holder<Attribute>` 的原因。
:::

## 属性修饰符 {#attribute-modifiers}

与查询相比，修改属性值没那么简单，因为同一个属性可能同时需要多项改动。

设想一个玩家攻击伤害属性为 1，手持增加 6 点攻击伤害的钻石剑，总攻击伤害为 7；随后喝下力量药水添加伤害倍率；接着又装备了添加另一个倍率的饰品。

为避免误算，并清楚表达属性值如何被修改，Minecraft 引入属性修饰符系统。每个属性有一个**基础值**，通常来自默认属性；随后可以添加任意数量的**属性修饰符**，每个修饰符都能单独移除，而无需担心操作应用顺序。

首先创建属性修饰符：

```java
// 修饰符名称。之后用于从属性映射中查询修饰符，
// 因此必须在语义上唯一。
Identifier id = Identifier.fromNamespaceAndPath("yourmodid", "my_modifier");
// 修饰符本身。
AttributeModifier modifier = new AttributeModifier(
    // 前面定义的名称。
    id,
    // 修改属性值的数量。
    2.0,
    // 应用修饰符的操作。可选值：
    // - AttributeModifier.Operation.ADD_VALUE：把值加到属性总值。
    // - AttributeModifier.Operation.ADD_MULTIPLIED_BASE：把值乘以属性基础值，
    //   再加到属性总值。
    // - AttributeModifier.Operation.ADD_MULTIPLIED_TOTAL：把值乘以属性总值
    //   （已经应用此前所有修改），再加到属性总值。
    AttributeModifier.Operation.ADD_VALUE
);
```

应用修饰符有两种选择：临时修饰符或永久修饰符。永久修饰符保存到磁盘，临时修饰符不会保存。永久修饰符适用于永久属性加成（例如某种盔甲或生命技能）；临时修饰符主要用于[装备][equipment]、[生物效果][mobeffect]等依赖玩家当前状态的修饰。

```java
AttributeMap attributes = livingEntity.getAttributes();
// 添加临时修饰符。如果同 ID 的修饰符已存在，会抛出异常。
attributes.getInstance(Attributes.ARMOR).addTransientModifier(modifier);
// 添加临时修饰符。如果同 ID 的修饰符已存在，先移除它。
attributes.getInstance(Attributes.ARMOR).addOrUpdateTransientModifier(modifier);
// 添加永久修饰符。如果同 ID 的修饰符已存在，会抛出异常。
attributes.getInstance(Attributes.ARMOR).addPermanentModifier(modifier);
// 添加永久修饰符。如果同 ID 的修饰符已存在，先移除它。
attributes.getInstance(Attributes.ARMOR).addOrReplacePermanentModifier(modifier);
```

也可以再次移除修饰符：

```java
// 按修饰符对象移除。
attributes.getInstance(Attributes.ARMOR).removeModifier(modifier);
// 按修饰符 ID 移除。
attributes.getInstance(Attributes.ARMOR).removeModifier(id);
// 移除某个属性的全部修饰符。
attributes.getInstance(Attributes.ARMOR).removeModifiers();
```

最后，还可以查询是否存在指定 ID 的修饰符，并分别查询基础值和修饰值：

```java
// 检查修饰符是否存在。
if (attributes.getInstance(Attributes.ARMOR).hasModifier(id)) { ... }
// 取得基础盔甲属性值。
double baseValue = attributes.getBaseValue(Attributes.ARMOR);
// 取得某个修饰符的值。
double modifierValue = attributes.getModifierValue(Attributes.ARMOR, id);
```

## 自定义属性 {#custom-attributes}

如有需要，也可以添加自定义属性。属性与其他许多系统一样是[注册表][registry]，可以注册自己的对象。首先创建 `DeferredRegister<Attribute>`：

```java
public static final DeferredRegister<Attribute> ATTRIBUTES = DeferredRegister.create(
    BuiltInRegistries.ATTRIBUTE, "yourmodid");
```

属性本身有三个可选类：

- `RangedAttribute`：大多数属性使用，定义上下限及默认值。
- `PercentageAttribute`：类似 `RangedAttribute`，但以百分比而不是浮点数显示。NeoForge 添加。
- `BooleanAttribute`：只表示语义上的 true（> 0）和 false（<= 0），内部仍使用 double。NeoForge 添加。

以 `RangedAttribute` 为例（另外两种用法类似），注册属性如下：

```java
public static final Holder<Attribute> MY_ATTRIBUTE = ATTRIBUTES.register("my_attribute", () -> new RangedAttribute(
    // 使用的翻译键。
    "attributes.yourmodid.my_attribute",
    // 默认值。
    0,
    // 最小值和最大值。
    -10000,
    10000
));
```

完成后不要忘记把 `DeferredRegister` 注册到模组总线。

:::info
这里使用 `Holder<Attribute>`，不像许多其他注册对象那样使用 `Supplier<RangedAttribute>`，因为这样更便于与实体交互（大多数实体方法需要 `Holder<Attribute>`）。

如果确实需要 `Supplier<RangedAttribute>`（或其他 `Attribute` 子类的 supplier），应使用 `DeferredHolder<Attribute, RangedAttribute>` 类型。

同样的规则适用于其他 `Attribute` 子类，即通常使用 `Holder<Attribute>`，而不是 `Supplier<PercentageAttribute>` 或 `Supplier<BooleanAttribute>`。
:::

[custom]: #custom-attributes
[equipment]: ../inventories/container.md#containers-on-entitys
[event]: ../concepts/events.md
[livingentity]: livingentity.md
[loottables]: ../../26.1/resources/server/loottables/index.md
[miningspeed]: ../blocks/index.md#mining-speed
[mobeffect]: ../items/mobeffects.md
[registry]: ../concepts/registries.md
[spawning]: index.md#spawning-entities
[toughness]: https://minecraft.wiki/w/Armor#Armor_toughness
[wiki]: https://minecraft.wiki
