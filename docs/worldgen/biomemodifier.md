import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# 生物群系修改器 {#biome-modifiers}

生物群系修改器是一套数据驱动系统，可用于修改生物群系的许多方面，包括注入或移除已放置特性、添加或移除生物生成、修改气候，以及调整植被和水体颜色。NeoForge 提供多种默认生物群系修改器，覆盖玩家和模组开发者的大多数常见需求。

### 推荐阅读

- 玩家或整合包开发者：
    - [应用生物群系修改器](#applying-biome-modifiers)
    - [NeoForge 内置生物群系修改器](#built-in-biome-modifiers)

- 只添加或移除简单生物群系内容的模组开发者：
    - [应用生物群系修改器](#applying-biome-modifiers)
    - [NeoForge 内置生物群系修改器](#built-in-biome-modifiers)
    - [使用数据生成创建生物群系修改器](#datagenning-biome-modifiers)
    - [定位可能不存在的生物群系](#targeting-biomes-that-may-not-exist)

- 需要自定义或复杂生物群系修改的模组开发者：
    - [应用生物群系修改器](#applying-biome-modifiers)
    - [创建自定义生物群系修改器](#creating-custom-biome-modifiers)
    - [使用数据生成创建生物群系修改器](#datagenning-biome-modifiers)
    - [定位可能不存在的生物群系](#targeting-biomes-that-may-not-exist)

## 应用生物群系修改器 {#applying-biome-modifiers}

要让 NeoForge 把生物群系修改器 JSON 加载到游戏中，文件应放在模组资源或[数据包][datapacks]中的 `data/<modid>/neoforge/biome_modifier/<path>.json` 目录下。NeoForge 加载文件后会读取其中的指令，并在世界加载时把描述的修改应用到所有目标生物群系。数据包也可以通过在同一位置放置同名 JSON 文件，覆盖模组原有的生物群系修改器。

可以按照[“NeoForge 内置生物群系修改器”](#built-in-biome-modifiers)中的示例手动创建 JSON 文件，也可以按[“使用数据生成创建生物群系修改器”](#datagenning-biome-modifiers)中的方式使用数据生成。

## 内置生物群系修改器 {#built-in-biome-modifiers}

以下生物群系修改器由 NeoForge 注册，任何模组都可以使用。

### 无操作 {#none}

此生物群系修改器不执行任何操作。整合包作者和玩家可以在数据包中使用下面的 JSON 覆盖模组的生物群系修改器，从而禁用它们。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
{
    "type": "neoforge:none"
}
```

</TabItem>
<TabItem value="datagen" label="数据生成">

```java
// 为生物群系修改器定义资源键。
public static final ResourceKey<BiomeModifier> NO_OP_EXAMPLE = ResourceKey.create(
    NeoForgeRegistries.Keys.BIOME_MODIFIERS, // 此键所属的注册表
    Identifier.fromNamespaceAndPath(MOD_ID, "no_op_example") // 注册名
);

// BUILDER 是传给 DatapackBuiltinEntriesProvider 的 RegistrySetBuilder，
// 该提供器在 `GatherDataEvent` 的监听器中注册。
BUILDER.add(NeoForgeRegistries.Keys.BIOME_MODIFIERS, bootstrap -> {
    // 注册生物群系修改器。
    bootstrap.register(NO_OP_EXAMPLE, NoneBiomeModifier.INSTANCE);
});
```

</TabItem>
</Tabs>

### 添加特性 {#add-features}

此生物群系修改器类型会把已放置特性（例如树木或矿物）添加到生物群系，使其能在世界生成期间生成。修改器接收要添加特性的生物群系 ID 或标签、要添加的已放置特性 ID 或标签，以及特性使用的 [`GenerationStep.Decoration`](#available-values-for-decoration-steps) 生成步骤。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
{
    "type": "neoforge:add_features",
    // 可以是生物群系 ID，例如 "minecraft:plains"；
    // 也可以是生物群系 ID 列表，例如 ["minecraft:plains", "minecraft:badlands", ...]；
    // 或生物群系标签，例如 "#c:is_overworld"。
    "biomes": "#namespace:your_biome_tag",
    // 可以是已放置特性 ID，例如 "examplemod:add_features_example"；
    // 也可以是已放置特性 ID 列表，例如 ["examplemod:add_features_example", "minecraft:ice_spike", ...]；
    // 或已放置特性标签，例如 "#examplemod:placed_feature_tag"。
    "features": "namespace:your_feature",
    // 有效枚举名见代码中的 GenerationStep.Decoration 枚举。
    // 下文“修饰步骤的可用值”一节也列出了这些值。
    "step": "underground_ores"
}
```

</TabItem>
<TabItem value="datagen" label="数据生成">

```java
// 假设已有名为 EXAMPLE_PLACED_FEATURE 的已放置特性。
// 为生物群系修改器定义资源键。
public static final ResourceKey<BiomeModifier> ADD_FEATURES_EXAMPLE = ResourceKey.create(
    NeoForgeRegistries.Keys.BIOME_MODIFIERS, // 此键所属的注册表
    Identifier.fromNamespaceAndPath(MOD_ID, "add_features_example") // 注册名
);

// BUILDER 是传给 DatapackBuiltinEntriesProvider 的 RegistrySetBuilder，
// 该提供器在 `GatherDataEvent` 的监听器中注册。
BUILDER.add(NeoForgeRegistries.Keys.BIOME_MODIFIERS, bootstrap -> {
    // 查找所需的注册表。
    // 只有需要取得标签数据时，才需要查找静态注册表。
    HolderGetter<Biome> biomes = bootstrap.lookup(Registries.BIOME);
    HolderGetter<PlacedFeature> placedFeatures = bootstrap.lookup(Registries.PLACED_FEATURE);

    // 注册生物群系修改器。
    bootstrap.register(ADD_FEATURES_EXAMPLE,
        new AddFeaturesBiomeModifier(
            // 在其中生成特性的生物群系
            HolderSet.direct(biomes.getOrThrow(Biomes.PLAINS)),
            // 在这些生物群系中生成的特性
            HolderSet.direct(placedFeatures.getOrThrow(EXAMPLE_PLACED_FEATURE)),
            // 生成步骤
            GenerationStep.Decoration.LOCAL_MODIFICATIONS
        )
    );
})
```

</TabItem>
</Tabs>

:::warning
向生物群系添加原版已放置特性时应当谨慎，否则可能触发“特性循环冲突”：两个生物群系在同一个 `GenerationStep` 中包含相同的两个特性，但顺序不同，最终导致崩溃。出于类似原因，也不应在多个生物群系修改器中使用同一个已放置特性。

原版已放置特性可以在生物群系 JSON 中引用，也可以通过生物群系修改器添加，但不应同时使用这两种方式。如果仍然需要这样添加，最简单的方法是在自己的命名空间下复制一份原版已放置特性，以避免这些问题。
:::

### 移除特性 {#remove-features}

此生物群系修改器类型会从生物群系中移除特性（例如树木或矿物），使其不再于世界生成期间生成。修改器接收要移除特性的生物群系 ID 或标签、要移除的已放置特性 ID 或标签，以及要移除特性的 [`GenerationStep.Decoration`](#available-values-for-decoration-steps) 步骤。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
{
    "type": "neoforge:remove_features",
    // 可以是生物群系 ID，例如 "minecraft:plains"；
    // 也可以是生物群系 ID 列表，例如 ["minecraft:plains", "minecraft:badlands", ...]；
    // 或生物群系标签，例如 "#c:is_overworld"。
    "biomes": "#namespace:your_biome_tag",
    // 可以是已放置特性 ID，例如 "examplemod:add_features_example"；
    // 也可以是已放置特性 ID 列表，例如 ["examplemod:add_features_example", "minecraft:ice_spike", ...]；
    // 或已放置特性标签，例如 "#examplemod:placed_feature_tag"。
    "features": "namespace:problematic_feature",
    // 可选字段，指定要移除特性的 GenerationStep 或 GenerationStep 列表。
    // 省略时默认处理所有 GenerationStep。
    // 有效枚举名见代码中的 GenerationStep.Decoration 枚举。
    // 下文“修饰步骤的可用值”一节也列出了这些值。
    "steps": ["underground_ores", "underground_decoration"]
}
```

</TabItem>
<TabItem value="datagen" label="数据生成">

```java
// 为生物群系修改器定义资源键。
public static final ResourceKey<BiomeModifier> REMOVE_FEATURES_EXAMPLE = ResourceKey.create(
    NeoForgeRegistries.Keys.BIOME_MODIFIERS, // 此键所属的注册表
    Identifier.fromNamespaceAndPath(MOD_ID, "remove_features_example") // 注册名
);

// BUILDER 是传给 DatapackBuiltinEntriesProvider 的 RegistrySetBuilder，
// 该提供器在 `GatherDataEvent` 的监听器中注册。
BUILDER.add(NeoForgeRegistries.Keys.BIOME_MODIFIERS, bootstrap -> {
    // 查找所需的注册表。
    // 只有需要取得标签数据时，才需要查找静态注册表。
    HolderGetter<Biome> biomes = bootstrap.lookup(Registries.BIOME);
    HolderGetter<PlacedFeature> placedFeatures = bootstrap.lookup(Registries.PLACED_FEATURE);

    // 注册生物群系修改器。
    bootstrap.register(REMOVE_FEATURES_EXAMPLE,
        new RemoveFeaturesBiomeModifier(
            // 要从中移除特性的生物群系
            biomes.getOrThrow(Tags.Biomes.IS_OVERWORLD),
            // 要从生物群系中移除的特性
            HolderSet.direct(placedFeatures.getOrThrow(OrePlacements.ORE_DIAMOND)),
            // 要从中移除特性的生成步骤
            Set.of(
                GenerationStep.Decoration.LOCAL_MODIFICATIONS,
                GenerationStep.Decoration.UNDERGROUND_ORES
            )
        )
    );
});
```

</TabItem>
</Tabs>

### 添加生成 {#add-spawns}

_另见[生物实体/自然生成][spawning]。_

此生物群系修改器类型会向生物群系添加实体生成。修改器接收要添加生成的生物群系 ID 或标签，以及要添加实体的 `SpawnerData`。每个 `SpawnerData` 都包含实体 ID、生成权重，以及在一次生成中出现的实体最小和最大数量。

:::note
如果要添加新实体，请确保为实体注册了生成限制，注册通过 `RegisterSpawnPlacementsEvent` 完成。生成限制用于让实体安全地生成在地面或水中。如果没有注册生成限制，实体可能生成在半空中，然后下落并死亡。
:::

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
{
    "type": "neoforge:add_spawns",
    // 可以是生物群系 ID，例如 "minecraft:plains"；
    // 也可以是生物群系 ID 列表，例如 ["minecraft:plains", "minecraft:badlands", ...]；
    // 或生物群系标签，例如 "#c:is_overworld"。
    "biomes": "#namespace:biome_tag",
    // 可以是单个对象或对象列表。
    "spawners": [
        {
            "type": "namespace:entity_type", // 要生成的实体类型 ID
            "weight": 100, // 非负整数，生成权重
            "minCount": 1, // 正整数，最小群体数量
            "maxCount": 4 // 正整数，最大群体数量
        },
        {
            "type": "minecraft:ghast",
            "weight": 1,
            "minCount": 5,
            "maxCount": 10
        }
    ]
}
```

</TabItem>
<TabItem value="datagen" label="数据生成">

```java
// 假设已有名为 EXAMPLE_ENTITY 的 EntityType<?>。
// 为生物群系修改器定义资源键。
public static final ResourceKey<BiomeModifier> ADD_SPAWNS_EXAMPLE = ResourceKey.create(
    NeoForgeRegistries.Keys.BIOME_MODIFIERS, // 此键所属的注册表
    Identifier.fromNamespaceAndPath(MOD_ID, "add_spawns_example") // 注册名
);

// BUILDER 是传给 DatapackBuiltinEntriesProvider 的 RegistrySetBuilder，
// 该提供器在 `GatherDataEvent` 的监听器中注册。
BUILDER.add(NeoForgeRegistries.Keys.BIOME_MODIFIERS, bootstrap -> {
    // 查找所需的注册表。
    // 只有需要取得标签数据时，才需要查找静态注册表。
    HolderGetter<Biome> biomes = bootstrap.lookup(Registries.BIOME);

    // 注册生物群系修改器。
    bootstrap.register(ADD_SPAWNS_EXAMPLE,
        new AddSpawnsBiomeModifier(
            // 在其中生成生物的群系
            HolderSet.direct(biomes.getOrThrow(Biomes.PLAINS)),
            // 要添加的实体生成数据
            List.of(
                new SpawnerData(EXAMPLE_ENTITY, 100, 1, 4),
                new SpawnerData(EntityType.GHAST, 1, 5, 10)
            )
        )
    );
});
```

</TabItem>
</Tabs>

### 移除生成 {#remove-spawns}

此生物群系修改器类型会从生物群系中移除实体生成。修改器接收要移除生成的生物群系 ID 或标签，以及要移除的实体 `EntityType` ID 或标签。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
{
    "type": "neoforge:remove_spawns",
    // 可以是生物群系 ID，例如 "minecraft:plains"；
    // 也可以是生物群系 ID 列表，例如 ["minecraft:plains", "minecraft:badlands", ...]；
    // 或生物群系标签，例如 "#c:is_overworld"。
    "biomes": "#namespace:biome_tag",
    // 可以是实体类型 ID，例如 "minecraft:ghast"；
    // 也可以是实体类型 ID 列表，例如 ["minecraft:ghast", "minecraft:skeleton", ...]；
    // 或实体类型标签，例如 "#minecraft:skeletons"。
    "entity_types": "#namespace:entitytype_tag"
}
```

</TabItem>
<TabItem value="datagen" label="数据生成">

```java
// 为生物群系修改器定义资源键。
public static final ResourceKey<BiomeModifier> REMOVE_SPAWNS_EXAMPLE = ResourceKey.create(
    NeoForgeRegistries.Keys.BIOME_MODIFIERS, // 此键所属的注册表
    Identifier.fromNamespaceAndPath(MOD_ID, "remove_spawns_example") // 注册名
);

// BUILDER 是传给 DatapackBuiltinEntriesProvider 的 RegistrySetBuilder，
// 该提供器在 `GatherDataEvent` 的监听器中注册。
BUILDER.add(NeoForgeRegistries.Keys.BIOME_MODIFIERS, bootstrap -> {
    // 查找所需的注册表。
    // 只有需要取得标签数据时，才需要查找静态注册表。
    HolderGetter<Biome> biomes = bootstrap.lookup(Registries.BIOME);
    HolderGetter<EntityType<?>> entities = bootstrap.lookup(Registries.ENTITY_TYPE);

    // 注册生物群系修改器。
    bootstrap.register(REMOVE_SPAWNS_EXAMPLE,
        new RemoveSpawnsBiomeModifier(
            // 要从中移除生成的生物群系
            biomes.getOrThrow(Tags.Biomes.IS_OVERWORLD),
            // 要移除其生成的实体
            entities.getOrThrow(EntityTypeTags.SKELETONS)
        )
    );
});
```

</TabItem>
</Tabs>

### 添加生成成本 {#add-spawn-costs}

此修改器可以向生物群系添加新的生成成本。生成成本是一种较新的机制，可用于让生物在生物群系中更分散地生成，从而减少聚集。其工作方式是让每个实体产生一定的 `charge`，这些值会在实体周围累加。生成新实体时，生成算法会寻找一个位置，使该位置的总 `charge` 乘以新实体的 `charge` 后，小于新实体的 `energy_budget`。这是一种高级生成机制；可以查看灵魂沙峡谷生物群系（该系统最典型的使用者）的现有数值，以便借鉴。

修改器接收要添加生成成本的生物群系 ID 或标签、要使用生成成本的实体 `EntityType` ID 或标签，以及实体的 `MobSpawnSettings.MobSpawnCost`。`MobSpawnCost` 包含能量预算，用于根据每个生成实体提供的 charge 限制某个位置最多能生成的实体数量。

:::note
如果要添加新实体，请确保为实体注册了生成限制，注册通过 `RegisterSpawnPlacementsEvent` 完成。
:::

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
{
    "type": "neoforge:add_spawn_costs",
    // 可以是生物群系 ID，例如 "minecraft:plains"；
    // 也可以是生物群系 ID 列表，例如 ["minecraft:plains", "minecraft:badlands", ...]；
    // 或生物群系标签，例如 "#c:is_overworld"。
    "biomes": "#namespace:biome_tag",
    // 可以是实体类型 ID，例如 "minecraft:ghast"；
    // 也可以是实体类型 ID 列表，例如 ["minecraft:ghast", "minecraft:skeleton", ...]；
    // 或实体类型标签，例如 "#minecraft:skeletons"。
    "entity_types": "#minecraft:skeletons",
    "spawn_cost": {
        // 能量预算
        "energy_budget": 1.0,
        // 每个实体从预算中占用的 charge
        "charge": 0.1
    }
}
```

</TabItem>
<TabItem value="datagen" label="数据生成">

```java
// 为生物群系修改器定义资源键。
public static final ResourceKey<BiomeModifier> ADD_SPAWN_COSTS_EXAMPLE = ResourceKey.create(
    NeoForgeRegistries.Keys.BIOME_MODIFIERS, // 此键所属的注册表
    Identifier.fromNamespaceAndPath(MOD_ID, "add_spawn_costs_example") // 注册名
);

// BUILDER 是传给 DatapackBuiltinEntriesProvider 的 RegistrySetBuilder，
// 该提供器在 `GatherDataEvent` 的监听器中注册。
BUILDER.add(NeoForgeRegistries.Keys.BIOME_MODIFIERS, bootstrap -> {
    // 查找所需的注册表。
    // 只有需要取得标签数据时，才需要查找静态注册表。
    HolderGetter<Biome> biomes = bootstrap.lookup(Registries.BIOME);
    HolderGetter<EntityType<?>> entities = bootstrap.lookup(Registries.ENTITY_TYPE);

    // 注册生物群系修改器。
    bootstrap.register(ADD_SPAWN_COSTS_EXAMPLE,
        new AddSpawnCostsBiomeModifier(
            // 要添加生成成本的生物群系
            biomes.getOrThrow(Tags.Biomes.IS_OVERWORLD),
            // 要添加生成成本的实体
            entities.getOrThrow(EntityTypeTags.SKELETONS),
            new MobSpawnSettings.MobSpawnCost(
                1.0, // 能量预算
                0.1  // 每个实体从预算中占用的 charge
            )
        )
    );
});
```

</TabItem>
</Tabs>

### 移除生成成本 {#remove-spawn-costs}

此修改器可以从生物群系中移除生成成本。生成成本是一种较新的机制，可用于让生物在生物群系中更分散地生成，从而减少聚集。修改器接收要移除生成成本的生物群系 ID 或标签，以及要移除其生成成本的实体 `EntityType` ID 或标签。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
{
    "type": "neoforge:remove_spawn_costs",
    // 可以是生物群系 ID，例如 "minecraft:plains"；
    // 也可以是生物群系 ID 列表，例如 ["minecraft:plains", "minecraft:badlands", ...]；
    // 或生物群系标签，例如 "#c:is_overworld"。
    "biomes": "#namespace:biome_tag",
    // 可以是实体类型 ID，例如 "minecraft:ghast"；
    // 也可以是实体类型 ID 列表，例如 ["minecraft:ghast", "minecraft:skeleton", ...]；
    // 或实体类型标签，例如 "#minecraft:skeletons"。
    "entity_types": "#minecraft:skeletons"
}
```

</TabItem>
<TabItem value="datagen" label="数据生成">

```java
// 为生物群系修改器定义资源键。
public static final ResourceKey<BiomeModifier> REMOVE_SPAWN_COSTS_EXAMPLE = ResourceKey.create(
    NeoForgeRegistries.Keys.BIOME_MODIFIERS, // 此键所属的注册表
    Identifier.fromNamespaceAndPath(MOD_ID, "remove_spawn_costs_example") // 注册名
);

// BUILDER 是传给 DatapackBuiltinEntriesProvider 的 RegistrySetBuilder，
// 该提供器在 `GatherDataEvent` 的监听器中注册。
BUILDER.add(NeoForgeRegistries.Keys.BIOME_MODIFIERS, bootstrap -> {
    // 查找所需的注册表。
    // 只有需要取得标签数据时，才需要查找静态注册表。
    HolderGetter<Biome> biomes = bootstrap.lookup(Registries.BIOME);
    HolderGetter<EntityType<?>> entities = bootstrap.lookup(Registries.ENTITY_TYPE);

    // 注册生物群系修改器。
    bootstrap.register(REMOVE_SPAWN_COSTS_EXAMPLE,
        new RemoveSpawnCostsBiomeModifier(
            // 要从中移除生成成本的生物群系
            biomes.getOrThrow(Tags.Biomes.IS_OVERWORLD),
            // 要移除生成成本的实体
            entities.getOrThrow(EntityTypeTags.SKELETONS)
        )
    );
});
```

</TabItem>
</Tabs>

### 添加旧版雕刻器 {#add-legacy-carvers}

此生物群系修改器类型可以向生物群系添加雕刻器洞穴和峡谷。这些内容用于洞穴与山崖更新之前的世界生成。此修改器**不能**向生物群系添加噪声洞穴，因为噪声洞穴属于某些基于噪声的区块生成器系统，并不与生物群系直接绑定。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
{
    "type": "neoforge:add_carvers",
    // 可以是生物群系 ID，例如 "minecraft:plains"；
    // 也可以是生物群系 ID 列表，例如 ["minecraft:plains", "minecraft:badlands", ...]；
    // 或生物群系标签，例如 "#c:is_overworld"。
    "biomes": "minecraft:plains",
    // 可以是雕刻器 ID，例如 "examplemod:add_carvers_example"；
    // 也可以是雕刻器 ID 列表，例如 ["examplemod:add_carvers_example", "minecraft:canyon", ...]；
    // 或雕刻器标签，例如 "#examplemod:configured_carver_tag"。
    "carvers": "examplemod:add_carvers_example"
}
```

</TabItem>
<TabItem value="datagen" label="数据生成">

```java
// 假设已有名为 EXAMPLE_CARVER 的 ConfiguredWorldCarver。
// 为生物群系修改器定义资源键。
public static final ResourceKey<BiomeModifier> ADD_CARVERS_EXAMPLE = ResourceKey.create(
    NeoForgeRegistries.Keys.BIOME_MODIFIERS, // 此键所属的注册表
    Identifier.fromNamespaceAndPath(MOD_ID, "add_carvers_example") // 注册名
);

// BUILDER 是传给 DatapackBuiltinEntriesProvider 的 RegistrySetBuilder，
// 该提供器在 `GatherDataEvent` 的监听器中注册。
BUILDER.add(NeoForgeRegistries.Keys.BIOME_MODIFIERS, bootstrap -> {
    // 查找所需的注册表。
    // 只有需要取得标签数据时，才需要查找静态注册表。
    HolderGetter<Biome> biomes = bootstrap.lookup(Registries.BIOME);
    HolderGetter<ConfiguredWorldCarver<?>> carvers = bootstrap.lookup(Registries.CONFIGURED_CARVER);

    // 注册生物群系修改器。
    bootstrap.register(ADD_CARVERS_EXAMPLE,
        new AddCarversBiomeModifier(
            // 在其中生成雕刻器的生物群系
            HolderSet.direct(biomes.getOrThrow(Biomes.PLAINS)),
            // 在这些生物群系中生成的雕刻器
            HolderSet.direct(carvers.getOrThrow(EXAMPLE_CARVER))
        )
    );
});
```

</TabItem>
</Tabs>

### 移除旧版雕刻器 {#remove-legacy-carvers}

此生物群系修改器类型可以从生物群系移除雕刻器洞穴和峡谷。这些内容用于洞穴与山崖更新之前的世界生成。此修改器**不能**从生物群系移除噪声洞穴，因为噪声洞穴内置于维度的噪声设置系统中，并不与生物群系直接绑定。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
{
    "type": "neoforge:remove_carvers",
    // 可以是生物群系 ID，例如 "minecraft:plains"；
    // 也可以是生物群系 ID 列表，例如 ["minecraft:plains", "minecraft:badlands", ...]；
    // 或生物群系标签，例如 "#c:is_overworld"。
    "biomes": "minecraft:plains",
    // 可以是雕刻器 ID，例如 "examplemod:add_carvers_example"；
    // 也可以是雕刻器 ID 列表，例如 ["examplemod:add_carvers_example", "minecraft:canyon", ...]；
    // 或雕刻器标签，例如 "#examplemod:configured_carver_tag"。
    "carvers": "examplemod:add_carvers_example"
}
```

</TabItem>
<TabItem value="datagen" label="数据生成">

```java
// 为生物群系修改器定义资源键。
public static final ResourceKey<BiomeModifier> REMOVE_CARVERS_EXAMPLE = ResourceKey.create(
    NeoForgeRegistries.Keys.BIOME_MODIFIERS, // 此键所属的注册表
    Identifier.fromNamespaceAndPath(MOD_ID, "remove_carvers_example") // 注册名
);

// BUILDER 是传给 DatapackBuiltinEntriesProvider 的 RegistrySetBuilder，
// 该提供器在 `GatherDataEvent` 的监听器中注册。
BUILDER.add(NeoForgeRegistries.Keys.BIOME_MODIFIERS, bootstrap -> {
    // 查找所需的注册表。
    // 只有需要取得标签数据时，才需要查找静态注册表。
    HolderGetter<Biome> biomes = bootstrap.lookup(Registries.BIOME);
    HolderGetter<ConfiguredWorldCarver<?>> carvers = bootstrap.lookup(Registries.CONFIGURED_CARVER);

    // 注册生物群系修改器。
    bootstrap.register(REMOVE_CARVERS_EXAMPLE,
        new AddFeaturesBiomeModifier(
            // 要从中移除雕刻器的生物群系
            biomes.getOrThrow(Tags.Biomes.IS_OVERWORLD),
            // 要从生物群系中移除的雕刻器
            HolderSet.direct(carvers.getOrThrow(Carvers.CAVE))
        )
    );
});
```

</TabItem>
</Tabs>

### 修饰步骤的可用值 {#available-values-for-decoration-steps}

前文许多 JSON 中的 `step` 或 `steps` 字段引用 `GenerationStep.Decoration` 枚举。该枚举按以下顺序列出生成步骤，这也是游戏在世界生成时使用的顺序。应尽量把特性放入最符合其用途的步骤。

| 步骤 | 说明 |
|:----:|------|
| `raw_generation` | 最先执行。用于小型末地岛屿等特殊地形特性。 |
| `lakes` | 专门生成岩浆湖等池塘类特性。 |
| `local_modifications` | 用于晶洞、冰山、巨石或滴水石等地形修改。 |
| `underground_structures` | 用于地牢或化石等小型地下结构类特性。 |
| `surface_structures` | 用于沙漠水井等小型地表结构类特性。 |
| `strongholds` | 专门用于要塞结构。未修改的 Minecraft 中不会在此添加特性。 |
| `underground_ores` | 所有矿物和矿脉的生成步骤，包括金、泥土、花岗岩等。 |
| `underground_decoration` | 通常用于装饰洞穴。滴水石簇和幽匿脉络位于此步骤。 |
| `fluid_springs` | 小型岩浆瀑布和水瀑布来自此阶段的特性。 |
| `vegetal_decoration` | 几乎所有植物（花、树、藤蔓等）都在此阶段添加。 |
| `top_layer_modification` | 最后执行。用于在寒冷生物群系表面放置雪和冰。 |

## 创建自定义生物群系修改器 {#creating-custom-biome-modifiers}

### `BiomeModifier` 实现 {#the-biomemodifier-implementation}

从底层来看，生物群系修改器由三部分组成：

- [在数据包中注册][datareg]的 `BiomeModifier`，用于修改生物群系构建器。
- [静态注册][staticreg]的 `MapCodec`，用于编码和解码修改器。
- 构造 `BiomeModifier` 的 JSON，其中使用已注册的 `MapCodec` ID 作为可索引类型。

`BiomeModifier` 包含两个方法：`#modify` 和 `#codec`。`modify` 接收当前 `Biome` 的 `Holder`、当前 `BiomeModifier.Phase`，以及要修改的生物群系构建器。每个 `BiomeModifier` 会在每个 `Phase` 中调用一次，以安排各类生物群系修改的执行时机：

| Phase | 说明 |
|:-----:|------|
| `BEFORE_EVERYTHING` | 处理所有需要在标准阶段之前运行的逻辑。 |
| `ADD` | 添加特性、生物生成等。 |
| `REMOVE` | 移除特性、生物生成等。 |
| `MODIFY` | 修改单个值，例如气候和颜色。 |
| `AFTER_EVERYTHING` | 处理所有需要在标准阶段之后运行的逻辑。 |

所有 `BiomeModifier` 都包含一个 `type` 键，用于引用该修改器使用的 `MapCodec` ID。`codec` 方法返回用于编码和解码修改器的 `MapCodec`；该 `MapCodec` 通过[静态注册][staticreg]注册，其 ID 会作为 `BiomeModifier` 的 `type`。

```java
public record ExampleBiomeModifier(HolderSet<Biome> biomes, int value) implements BiomeModifier {
    
    @Override
    public void modify(Holder<Biome> biome, Phase phase, ModifiableBiomeInfo.BiomeInfo.Builder builder) {
        if (phase == /* 选择最符合修改需求的阶段 */) {
            // 修改 'builder'，必要时检查生物群系本身的信息。
        }
    }

    @Override
    public MapCodec<? extends BiomeModifier> codec() {
        return EXAMPLE_BIOME_MODIFIER.get();
    }
}

// 在某个注册类中
private static final DeferredRegister<MapCodec<? extends BiomeModifier>> BIOME_MODIFIERS =
    DeferredRegister.create(NeoForgeRegistries.Keys.BIOME_MODIFIER_SERIALIZERS, MOD_ID);

public static final Supplier<MapCodec<ExampleBiomeModifier>> EXAMPLE_BIOME_MODIFIER =
    BIOME_MODIFIERS.register("example_biome_modifier", () -> RecordCodecBuilder.mapCodec(instance ->
        instance.group(
            Biome.LIST_CODEC.fieldOf("biomes").forGetter(ExampleBiomeModifier::biomes),
            Codec.INT.fieldOf("value").forGetter(ExampleBiomeModifier::value)
        ).apply(instance, ExampleBiomeModifier::new)
    ));
```

## 使用数据生成创建生物群系修改器 {#datagenning-biome-modifiers}

可以把 `RegistrySetBuilder` 传给 `DatapackBuiltinEntriesProvider`，通过[数据生成][datagen]创建 `BiomeModifier` JSON。生成的 JSON 会放在 `data/<modid>/neoforge/biome_modifier/<path>.json`。

关于 `RegistrySetBuilder` 和 `DatapackBuiltinEntriesProvider` 的更多信息，请参阅[数据包注册表的数据生成][datapackdatagen]。

```java
// 为生物群系修改器定义资源键。
public static final ResourceKey<BiomeModifier> EXAMPLE_MODIFIER = ResourceKey.create(
    NeoForgeRegistries.Keys.BIOME_MODIFIERS, // 此键所属的注册表
    Identifier.fromNamespaceAndPath(MOD_ID, "example_modifier") // 注册名
);

// BUILDER 是传给 DatapackBuiltinEntriesProvider 的 RegistrySetBuilder，
// 该提供器在 `GatherDataEvent` 的监听器中注册。
BUILDER.add(NeoForgeRegistries.Keys.BIOME_MODIFIERS, bootstrap -> {
    // 查找所需的注册表。
    // 只有需要取得标签数据时，才需要查找静态注册表。
    HolderGetter<Biome> biomes = bootstrap.lookup(Registries.BIOME);

    // 注册生物群系修改器。
    bootstrap.register(EXAMPLE_MODIFIER,
        new ExampleBiomeModifier(
            biomes.getOrThrow(Tags.Biomes.IS_OVERWORLD),
            20
        )
    );
});
```

上面的代码会生成以下 JSON：

```json5
// 文件位置：data/examplemod/neoforge/biome_modifier/example_modifier.json
{
    // 修改器使用的 MapCodec 注册键
    "type": "examplemod:example_biome_modifier",
    // 其他所有设置都应用到根对象
    "biomes": "#c:is_overworld",
    "value": 20
}
```

## 定位可能不存在的生物群系 {#targeting-biomes-that-may-not-exist}

有时，生物群系修改器需要定位一个不一定存在于游戏中的生物群系。如果直接定位未注册的生物群系，世界加载时会崩溃。可以在生物群系标签中把目标生物群系添加为可选条目，并将条目的 `required` 设为 `false`，以解决这个问题：

```json5
{
    "replace": false,
    "values": [
        {
            "id": "minecraft:pale_garden",
            "required": false
        }
    ]
}
```

生物群系修改器现在可以使用这个标签，即使目标生物群系没有注册也不会崩溃。一个例子是苍白之园：它只会在启用 Winter Drop 数据包的 1.21.3 中生成；否则，该生物群系根本不会存在于生物群系注册表中。另一个例子是定位模组生物群系，同时让修改器在添加这些生物群系的模组不存在时仍能正常工作。

要使用数据生成创建可选生物群系标签条目，代码大致如下：

```java
// 在 KeyTagProvider<Biome> 的子类中
// 假设已有名为 OPTIONAL_BIOMES_TAG 的 TagKey<Biome>。
@Override
protected void addTags(HolderLookup.Provider registries) {
    this.tag(OPTIONAL_BIOMES_TAG)
        // 必须传入 ResourceKey<Biome>
        .addOptional(Biomes.PALE_GARDEN);
}
```

[datagen]: ../resources/index.md#data-generation
[datapackdatagen]: ../concepts/registries.md#data-generation-for-datapack-registries
[datapacks]: ../resources/index.md#data
[datareg]: ../concepts/registries.md#datapack-registries
[spawning]: ../entities/livingentity.md#natural-spawning
[staticreg]: ../concepts/registries.md#methods-for-registering
