---
sidebar_position: 1
---
# 交互

玩家左键单击、右键单击或中键单击物品时会触发相当复杂且容易混淆的流程。本文旨在把这些流程解释清楚，并说明在何处应使用何种结果，以及原因。

## `HitResult` {#hitresults}

Minecraft 使用 `HitResult` 判断玩家当前看向的目标。它大致相当于其他游戏引擎中的射线检测结果，尤其提供一个 `#getLocation` 方法。

命中结果有三种类型，由 `HitResult.Type` 枚举表示：`BLOCK`、`ENTITY` 和 `MISS`。类型为 `BLOCK` 的 `HitResult` 可以转换为 `BlockHitResult`；类型为 `ENTITY` 的可以转换为 `EntityHitResult`。两者都提供命中的[方块][block]或[实体][entity]的额外上下文。如果类型为 `MISS`，说明没有命中方块或实体，不应转换为任一子类。

在[物理客户端][physicalside]上，`Minecraft` 类每帧都会更新并把当前看向的 `HitResult` 保存到 `hitResult` 字段。可以通过 `Minecraft.getInstance().hitResult` 访问它。

## 左键单击物品 {#left-clicking-an-item}

- 检查主手 [`ItemStack`][itemstack] 所需的所有[功能标志][featureflag]是否已启用。检查失败时流程结束。
- 如果 `Player#cannotAttackWithItem` 返回 false，流程结束。该方法会检查攻击冷却和 `DataComponents#MINIMUM_ATTACK_CHARGE`。
- 使用鼠标左键和主手触发 `InputEvent.InteractionKeyMappingTriggered`。如果[事件][event]被[取消][cancel]，流程结束。
- 根据你看向的目标（通过 `Minecraft` 中的 [`HitResult`][hitresult]判断），会执行不同逻辑：
    - 如果手持物品带有 `DataComponents#PIERCING_WEAPON`：
        - 仅服务端：调用 `PiercingWeapon#attack`。
            - 使用 `ProjectileUtil#getHitEntitiesAlong` 取得所有满足以下条件的实体：
                - 位于攻击者交互范围和物品攻击范围（`DataComponents#ATTACK_RANGE`）内。
                - 未处于无敌状态，并且可以被弹射物命中。
                - 不是同一载具上的乘客。
            - 对每个实体调用 `LivingEntity#stabAttack`。如果目标成功受到伤害、击退或被击落载具，则返回 true：
                - 从 `ItemStack#getDamageSource` 取得伤害来源。
                - 调用 [`Entity#hurtServer`][hurt]。
                - 如果刺击武器造成击退，调用 `LivingEntity#causeExtraKnockback`。
                - 如果刺击武器命中时会把目标击下载具，并且目标是乘客，调用 `Entity#stopRiding`。
                - 如果目标是 `LivingEntity`，调用 `ItemStack#hurtEnemy`。
                - 如果目标成功受到伤害，应用 `EnchantmentHelper#doPostAttackEffects`。
                - 如果目标成功受到伤害、击退或被击落载具，则：
                    - 以目标实体调用 `LivingEntity#setLastHurtMob`。
                    - 调用 `LivingEntity#playAttackSound`。
        - 调用 `LivingEntity#onAttack`。
        - 调用 `LivingEntity#lungerForwardMaybe`。它会通过 `EnchantmentHelper#doLungeEffects` 应用突进效果。
        - 仅服务端：如果 `LivingEntity#stabAttack` 至少对一个目标返回 true，调用 `PiercingWeapon#makeHitSound`。
        - 仅服务端：调用 `PiercingWeapon#makeSound`。
        - 调用 `LivingEntity#swing`。
    - 如果看向范围内某个[实体][entity]：
        - 触发 `AttackEntityEvent`。如果事件被取消，流程结束。
        - 调用 `IItemExtension#onLeftClickEntity`。如果返回 true，流程结束。
        - 对目标调用 `Entity#isAttackable`。如果返回 false，流程结束。
        - 对目标调用 `Entity#skipAttackInteraction`。如果返回 true，流程结束。
        - 如果目标位于 `minecraft:redirectable_projectile` 标签中（默认包括火球和风弹）并且是 `Projectile` 实例，目标会被偏转，流程结束。
        - 实体基础伤害（`minecraft:attack_damage` [属性][attribute]的值）和附魔额外伤害会分别计算为两个 float。如果二者都为 0，流程结束。
            - 注意，这不包括主手物品提供的[属性修饰符][attributemodifier]；它们会在检查后加入。
        - 把主手物品提供的 `minecraft:attack_damage` 属性修饰符加入基础伤害。
        - 触发 `CriticalHitEvent`。如果事件的 `#isCriticalHit` 返回 true，就把基础伤害乘以 `#getDamageMultiplier` 的返回值。满足[若干条件][critical]时默认返回 1.5，否则返回 1.0；事件仍可修改该值。
        - 把附魔额外伤害加入基础伤害，得到最终伤害值。
        - 触发 `SweepAttackEvent`。如果事件的 `isSweeping` 返回 true，玩家会执行横扫攻击。默认条件包括：攻击冷却大于 90%、本次不是暴击、玩家站在地面上，且移动速度不超过其 `minecraft:movement_speed` 属性值。
        - 调用 [`Entity#hurtOrSimulate`][hurt]。如果返回 false，流程结束。
        - 如果目标是 `LivingEntity`，攻击强度大于 90%，玩家正在疾跑，并且经过附魔修改后的 `minecraft:attack_knockback` 属性大于 0，则调用 `LivingEntity#knockback`。
            - 该方法内部会触发 `LivingKnockBackEvent`。如果事件被取消，则不应用击退。
        - 玩家根据 `SweepAttackEvent#isSweeping` 对附近的 `LivingEntity` 执行横扫攻击。
            - 该方法内部，如果实体位于玩家攻击范围内且 `Entity#hurtServer` 返回 true，会再次调用 `LivingEntity#knockback`，从而再次触发 `LivingKnockBackEvent`。
        - 调用 `Item#hurtEnemy`，可用于攻击后的效果。例如，重锤会在这里把玩家重新弹向空中。
        - 调用 `Item#postHurtEnemy`，物品耐久损耗在这里应用。
            - 如果耐久降为 0，物品堆变为 `ItemStack#EMPTY`，并触发 `PlayerDestroyItemEvent`。
    - 如果看向范围内某个[方块][block]：
        - 启动[方块破坏子流程][blockbreak]。
    - 其他情况：
        - 触发 `PlayerInteractEvent.LeftClickEmpty`。

## 右键单击物品 {#right-clicking-an-item}

右键流程中会调用多个返回两种结果类型之一的方法（见下文）。如果方法明确返回成功或失败，通常会结束流程。为便于阅读，下文把“明确成功或明确失败”统称为“确定结果”。

- 使用鼠标右键和主手触发 `InputEvent.InteractionKeyMappingTriggered`。如果[事件][event]被[取消][cancel]，流程结束。
- 检查若干条件，例如玩家不在旁观模式、主手 [`ItemStack`][itemstack] 所需的所有[功能标志][featureflag]均已启用。只要有一项失败，流程结束。
- 根据你看向的目标（通过 `Minecraft` 中的 [`HitResult`][hitresult]判断），会执行不同逻辑：
    - 如果看向范围内且未超出世界边界的[实体][entity]：
        - 触发 `PlayerInteractEvent.EntityInteractSpecific`。如果事件被取消，流程结束。
        - 在**你看向的实体上**调用 `Entity#interactAt`。如果返回确定结果，流程结束。
            - 如果要为自己的实体添加行为，应重写此方法；如果要为原版实体添加行为，应使用事件。
        - 如果实体打开了界面（例如村民交易界面或运输矿车界面），流程结束。
        - 触发 `PlayerInteractEvent.EntityInteract`。如果事件被取消，流程结束。
        - 在**你看向的实体上**调用 `Entity#interact`。如果返回确定结果，流程结束。
            - 如果要为自己的实体添加行为，应重写此方法；如果要为原版实体添加行为，应使用事件。
            - 对于 [`Mob`][livingentity]，`Entity#interact` 的重写实现会处理拴绳，以及主手物品为刷怪蛋时生成幼年生物等行为，然后把生物专属逻辑交给 `Mob#mobInteract`。`Entity#interact` 的结果规则同样适用于这里。
        - 如果看向的实体是 `LivingEntity`，对主手 `ItemStack` 调用 `Item#interactLivingEntity`。如果返回确定结果，流程结束。
    - 如果看向范围内且未超出世界边界的[方块][block]：
        - 触发 `PlayerInteractEvent.RightClickBlock`。如果事件被取消，流程结束。也可以在该事件中单独禁止方块使用或物品使用。
        - 调用 `IItemExtension#onItemUseFirst`。如果返回确定结果，流程结束。
        - 如果 `IItemExtension#doesSneakBypassUse` 返回 false，且事件没有禁止方块使用，则触发 `UseItemOnBlockEvent`。如果事件被取消，就使用取消结果；否则调用 `BlockBehaviour#useItemOn`。如果返回确定结果，流程结束。
        - 如果 `InteractionResult` 是 `TryEmptyHandInteraction` 的实例（例如 `TRY_WITH_EMPTY_HAND`），且执行交互的是主手，则调用 `BlockBehaviour#useWithoutItem`。如果返回确定结果，流程结束。
        - 如果事件没有禁止物品使用，则调用 `Item#useOn`。如果返回确定结果，流程结束。
     - 其他情况：
        - 触发 `PlayerInteractEvent.RightClickEmpty`。
- 触发 `PlayerInteractEvent.RightClickItem`。如果事件被取消，流程结束。
- 调用 `Item#use`。
    - 如果 `InteractionResult` 是 `Success` 的实例（例如 `SUCCESS`），则把 `ItemStack` 修改为 `Success#heldItemTransformedTo`。
- 如果当前物品堆与原物品堆不一致，且新物品堆为空，则触发 `PlayerDestroyItemEvent`。
- 以上流程会用副手代替主手再执行一次。

### `InteractionResult`

`InteractionResult` 是一个 sealed interface，表示物品或空手与某个对象（如实体、方块等）交互的结果。接口由四个 record 组成，总共有六种可能的默认状态。

首先是 `InteractionResult.Success`，表示操作成功并结束流程。成功状态有两个参数：`SwingSource` 表示实体是否应在相应[逻辑端][side]摆动手臂；`InteractionResult.ItemContext` 保存交互是否由手持物品引起，以及物品使用后变成了什么。摆动来源由某个默认状态决定：`InteractionResult#SUCCESS` 表示客户端摆动，`InteractionResult#SUCCESS_SERVER` 表示服务端摆动，`InteractionResult#CONSUME` 表示不摆动。如果 `ItemStack` 发生变化，通过 `Success#heldItemTransformedTo` 设置物品上下文；如果手持物品与对象之间没有交互，则使用 `withoutItem`。后者默认表示发生过物品交互但没有变换。

```java
// 位于某个返回交互结果的方法中

// 手中的物品将变成苹果
return InteractionResult.SUCCESS.heldItemTransformedTo(new ItemStack(Items.APPLE));
```

:::note
通常不应在同一个方法中使用 `SUCCESS` 和 `SUCCESS_SERVER`。如果客户端拥有足够信息判断何时摆动手臂，就应始终使用 `SUCCESS`；如果判断依赖客户端没有的服务端信息，则应使用 `SUCCESS_SERVER`。
:::

接下来是 `InteractionResult.Fail`，由 `InteractionResult#FAIL` 实现。它表示操作失败，不允许继续交互，并结束流程。它可用于任何位置，但在 `Item#useOn` 和 `Item#use` 之外应谨慎使用；许多情况下使用 `InteractionResult#PASS` 更合理。

最后是 `InteractionResult.Pass` 和 `InteractionResult.TryWithEmptyHandInteraction`，分别由 `InteractionResult#PASS` 和 `InteractionResult#TRY_WITH_EMPTY_HAND` 实现。这两个 record 表示操作既不算成功也不算失败，流程应继续。除 `BlockBehaviour#useItemOn`（返回 `TRY_WITH_EMPTY_HAND`）外，所有 `InteractionResult` 方法的默认行为都是 `PASS`。具体而言，如果 `BlockBehaviour#useItemOn` 返回的不是 `TRY_WITH_EMPTY_HAND`，无论物品是否位于主手，都不会调用 `BlockBehaviour#useWithoutItem`。

某些方法有特殊行为或要求，下面分别说明。

#### `Item#useOn` {#itemuseon}

如果希望操作被视为成功，但不想让手臂摆动或增加 `ITEM_USED` 统计，请使用 `InteractionResult#CONSUME` 并调用 `#withoutItem`。

```java
// 位于 Item#useOn 中
return InteractionResult.CONSUME.withoutItem();
```

#### `Item#use`

这是唯一会使用 `Success` 变体（`SUCCESS`、`SUCCESS_SERVER`、`CONSUME`）中变换后 `ItemStack` 的地方。如果物品堆发生变化，由 `Success#heldItemTransformedTo` 设置的新 `ItemStack` 会替换发起使用时的物品堆。

`Item#use` 的默认实现行为如下：如果物品可食用（有 `DataComponents#CONSUMABLE`）且玩家能够食用（因为饥饿，或物品始终可食用），返回 `InteractionResult#CONSUME`；如果物品可食用但玩家不能食用，返回 `InteractionResult#FAIL`。如果物品可装备（有 `DataComponents#EQUIPPABLE`），成功交换时返回 `InteractionResult#SUCCESS`，并通过 `heldItemTransformedTo` 把手持物品替换为交换后的物品；如果盔甲附魔带有 `EnchantmentEffectComponents#PREVENT_ARMOR_CHANGE`，则返回 `InteractionResult#FAIL`。如果物品可以格挡攻击（有 `DataComponents#BLOCKS_ATTACKS`），在返回 `InteractionResult#CONSUME` 前会调用 `Item#startUsingItem`。否则返回 `InteractionResult#PASS`。

在主手判断中返回 `InteractionResult#FAIL` 会阻止副手行为。如果希望副手行为继续执行（通常应当如此），请改为返回 `InteractionResult#PASS`。

## 中键单击 {#middle-clicking}

- 如果 `Minecraft.getInstance().hitResult` 中的 [`HitResult`][hitresult] 为 null 或类型为 `MISS`，流程结束。
- 使用鼠标左键和主手触发 `InputEvent.InteractionKeyMappingTriggered`。如果[事件][event]被[取消][cancel]，流程结束。
- 根据 `Minecraft.getInstance().hitResult` 中的目标，会执行不同逻辑：
    - 如果看向范围内某个[实体][entity]：
        - 如果 `Entity#isPickable` 返回 false，流程结束。
        - 如果 `Player#isWithinEntityInteractionRange` 返回 false，流程结束。
        - 调用 `Entity#getPickResult`。如果快捷栏中存在与结果 `ItemStack` 一致的槽位，则设为当前槽位；否则如果玩家处于创造模式，则把结果物品堆加入物品栏。
            - 默认情况下，该方法会转发到 `Entity#getPickResult`，模组作者可以重写它。
    - 如果看向范围内某个[方块][block]：
        - 如果 `Player#isWithinBlockInteractionRange` 返回 false，流程结束。
        - 调用 `IBlockExtension#getCloneItemStack`（默认委托给 `BlockBehaviour#getCloneItemStack`），得到“选中”的 `ItemStack`。
            - 默认情况下，它返回方块的 `Item` 表示。
        - 如果按住 Control 键、玩家处于创造模式，并且目标方块有 [`BlockEntity`][blockentity]：
            - 从 `BlockEntity#saveCustomOnly` 取得方块实体数据。
                - 作为后处理步骤，调用 `BlockEntity#removeComponentsFromTag`。
            - 通过 `DataComponents#BLOCK_ENTITY_DATA` 把方块实体数据加入“选中”的 `ItemStack`。
        - 如果快捷栏中存在与“选中”的 `ItemStack` 一致的槽位，则设为当前槽位；否则如果玩家处于创造模式，则把“选中”物品堆加入物品栏。

[attribute]: ../entities/attributes.md
[attributemodifier]: ../entities/attributes.md#attribute-modifiers
[block]: ../blocks/index.md
[blockbreak]: ../blocks/index.md#breaking-a-block
[blockentity]: ../blockentities/index.md
[cancel]: ../concepts/events.md#cancellable-events
[critical]: https://minecraft.wiki/w/Damage#Critical_hit
[effect]: mobeffects.md
[entity]: ../entities/index.md
[event]: ../concepts/events.md
[featureflag]: ../advanced/featureflags.md
[hitresult]: #hitresults
[hurt]: ../entities/index.md#damaging-entities
[itemstack]: index.md#itemstacks
[itemuseon]: #itemuseon
[livingentity]: ../entities/livingentity.md
[physicalside]: ../concepts/sides.md#the-physical-side
[side]: ../concepts/sides.md#the-logical-side
