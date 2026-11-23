# 伤害类型与伤害来源

伤害类型表示施加给[实体]的伤害种类，例如物理伤害、火焰伤害、溺水伤害、魔法伤害和虚空伤害等。区分伤害类型可用于多种免疫机制（例如烈焰人不会受到火焰伤害）、魔咒（例如爆炸保护只防护爆炸伤害）以及许多其他场景。

可以说，伤害类型是伤害来源的模板，换言之，伤害来源可以看作伤害类型的实例。伤害类型在代码中以 [`ResourceKey`][rk] 存在，但所有属性都在数据包中定义。伤害来源则由游戏按需创建，以数据包文件中的值为基础，并且可以保存额外上下文，例如攻击实体。

## 创建伤害类型

首先创建自己的 `DamageType`。`DamageType` 属于[数据包注册表][dr]，因此新的 `DamageType` 不在代码中注册，而是在添加对应文件时自动注册。不过，代码仍需要某个入口来获取伤害来源，因此要指定一个[资源键][rk]：

```java
public static final ResourceKey<DamageType> EXAMPLE_DAMAGE =
        ResourceKey.create(Registries.DAMAGE_TYPE, Identifier.fromNamespaceAndPath(ExampleMod.MOD_ID, "example"));
```

现在代码可以引用它了，接下来在数据文件中指定属性。数据文件位于 `data/examplemod/damage_type/example.json`（把 `examplemod` 和 `example` 替换为模组 ID 和资源位置名称），内容如下：

```json5
{
    // 伤害类型的死亡消息 ID。完整的死亡消息翻译键为
    // "death.attack.examplemod.example"（替换其中的模组 ID 和名称）。
    "message_id": "examplemod.example",
    // 该伤害类型的伤害量是否随难度缩放。原版有效值：
    // - "never"：任何难度下伤害值都不变。玩家造成的伤害类型常用此值。
    // - "when_caused_by_living_non_player"：如果伤害由某种生物造成，包括间接造成
    //   （例如骷髅射出的箭），而且该生物不是玩家，则缩放伤害值。
    // - "always"：始终缩放伤害值。爆炸类伤害常用此值。
    "scaling": "when_caused_by_living_non_player",
    // 受到这种伤害时造成的疲劳值。
    "exhaustion": 0.1,
    // 受到这种伤害时应用的伤害效果（目前只有声音效果）。可选。
    // 原版有效值为 "hurt"（默认）、"thorns"、"drowning"、"burning"、"poking" 和 "freezing"。
    "effects": "hurt",
    // 死亡消息类型，决定死亡消息如何构建。可选。
    // 原版有效值为 "default"（默认）、"fall_variants" 和 "intentional_game_design"。
    "death_message_type": "default"
}
```

:::tip
`scaling`、`effects` 和 `death_message_type` 字段在内部分别由枚举 `DamageScaling`、`DamageEffects` 和 `DeathMessageType` 控制。需要时可以[扩展][extenum]这些枚举来添加自定义值。
:::

原版伤害类型也使用相同格式，资源包开发者可以按需修改这些值。

## 创建和使用伤害来源 {#creating-and-using-damage-sources}

`DamageSource` 通常在调用 [`Entity#hurt`][entityhurt] 时动态创建。注意，由于伤害类型属于[数据包注册表][dr]，查询它们需要 `RegistryAccess`，可通过 `Level#registryAccess` 获取。调用 `DamageSource` 构造方法最多可传入四个参数：

```java
DamageSource damageSource = new DamageSource(
        // 要使用的伤害类型 holder。从注册表查询。这是唯一的必需参数。
        registryAccess.lookupOrThrow(Registries.DAMAGE_TYPE).getOrThrow(EXAMPLE_DAMAGE),
        // 直接实体。例如骷髅射中你时，骷髅是造成伤害的实体
        //（即上一个参数），箭是直接实体（即本参数）。与造成伤害的实体类似，
        // 它并非总是适用，因此可以为 null。可选，默认 null。
        null,
        // 造成伤害的实体。它并非总是适用（例如从世界中掉落），
        // 因此可以为 null。可选，默认 null。
        null,
        // 伤害来源位置。很少使用，例如刻意设计的情况
        //（如下界床爆炸）。可为 null，可选，默认 null。
        null
);
```

:::warning
`DamageSources#source` 是围绕 `new DamageSource` 的包装方法，但它交换了第二和第三个参数（直接实体与造成伤害的实体）。请确保把正确的值传给正确的参数。
:::

如果 `DamageSource` 完全没有实体或位置上下文，适合把它缓存在字段中。带有实体或位置上下文的 `DamageSource` 通常可添加辅助方法，例如：

```java
public static DamageSource exampleDamage(Entity causer) {
    return new DamageSource(
            causer.level().registryAccess().lookupOrThrow(Registries.DAMAGE_TYPE).getOrThrow(EXAMPLE_DAMAGE),
            causer);
}
```

:::tip
原版 `DamageSource` 工厂方法位于 `DamageSources`，原版 `DamageType` 资源键位于 `DamageTypes`。实体还提供 `Entity#damageSources` 方法，可方便地取得 `DamageSources` 实例。
:::

伤害来源最重要的用途是 `Entity#hurt`。实体受到伤害时就会调用该方法。要用自己的伤害类型伤害实体，直接调用 `Entity#hurt` 即可：

```java
// 第二个参数是伤害量，单位为半颗心。
entity.hurt(exampleDamage(player), 10);
```

其他特定于伤害类型的行为（例如无敌检查）通常通过伤害类型[标签]实现。相关标签分别由 Minecraft 和 NeoForge 添加，可在 `DamageTypeTags` 和 `Tags.DamageTypes` 中找到。

## 数据生成

_更多信息请参阅[数据包注册表的数据生成][drdatagen]。_

伤害类型 JSON 文件可以[数据生成][datagen]。由于伤害类型属于数据包注册表，应通过 `GatherDataEvent#createDatapackRegistryObjects` 添加 `DatapackBuiltinEntriesProvider`，并把伤害类型放入 `RegistrySetBuilder`：

```java
// 在你的数据生成类中
@SubscribeEvent // 在模组事件总线上
public static void onGatherData(GatherDataEvent.Client event) {
    event.createDatapackRegistryObjects(new RegistrySetBuilder()
        // 为伤害类型添加数据包内置条目 provider。如果该 lambda 变长，
        // 为了提高可读性，最好把它提取到单独的方法中。
        .add(Registries.DAMAGE_TYPE, bootstrap -> {
            // 使用 new DamageType() 在代码中创建伤害类型表示。
            // 参数按上面的顺序对应 JSON 文件中的值。
            // 除消息 ID 和疲劳值外的所有参数都是可选的。
            bootstrap.register(EXAMPLE_DAMAGE, new DamageType(EXAMPLE_DAMAGE.identifier(),
                DamageScaling.WHEN_CAUSED_BY_LIVING_NON_PLAYER,
                0.1f,
                DamageEffects.HURT,
                DeathMessageType.DEFAULT)
            )
        })
        // 如果适用，为其他数据包条目添加数据包 provider。
        .add(...)
    );

    // ...
}
```

[datagen]: ../index.md#data-generation
[dr]: ../../concepts/registries.md#datapack-registries
[drdatagen]: ../../concepts/registries.md#data-generation-for-datapack-registries
[entity]: ../../entities/index.md
[entityhurt]: ../../entities/index.md#damaging-entities
[extenum]: ../../advanced/extensibleenums.md
[rk]: ../../misc/identifier.md#resourcekeys
[tags]: tags.md
