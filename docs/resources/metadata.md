---
sidebar_position: 3
---

# 资源元数据

`.mcmeta` 扩展名可为游戏中的任意资源或数据对象保存 JSON 元数据。它最常见的用途是定义资源包信息以及纹理的应用方式；不过，只要在文件名末尾加上 `.mcmeta`，就能为任意文件添加元数据（例如，`apple.png` 的资源元数据文件是 `apple.png.mcmeta`）。

:::note
数据包中的 JSON 对象虽然也可以有资源元数据，但这不会生效，因为元数据可以直接写在 JSON 文件本身中。
:::

## 元数据段

JSON 元数据对象按段拆分：键表示段类型，值是该段的数据。在代码库中，这一概念称为 `MetadataSectionType`，它接收 `String` 键和用于序列化值的 [`Codec`][codec]。

原版和 NeoForge 目前提供以下元数据段：

| 段                               | 类                                                            | 所在位置                | 用途                                                       |
|:--------------------------------:|:-------------------------------------------------------------:|:-----------------------:|:----------------------------------------------------------:|
| `pack`                           | `PackMetadataSection`                                         | `pack.mcmeta`           | [资源包信息][pack]                                         |
| `features`                       | `FeatureFlagsMetadataSection`                                 | `pack.mcmeta`           | [启用实验性功能][features]                                 |
| `filter`                         | `ResourceFilterSection`                                       | `pack.mcmeta`           | 为在此包之后应用的资源包过滤文件                           |
| `overlays` / `neoforge:overlays` | `OverlayMetadataSection` / `GeneratingOverlayMetadataSection` | `pack.mcmeta`           | 按给定条件覆盖在主包之上的子包                             |
| `language`                       | `LanguageMetadataSection`                                     | `pack.mcmeta`           | 额外语言，仅适用于资源包                                   |
| `animation`                      | `AnimationMetadataSection`                                    | `.png.mcmeta`（纹理）   | [动画图集纹理][animation]                                  |
| `gui`                            | `GuiMetadataSection`                                          | `.png.mcmeta`（纹理）   | [GUI 精灵纹理][texture]                                    |
| `texture`                        | `TextureMetadataSection`                                      | `.png.mcmeta`（纹理）   | [纹理][texture]                                            |
| `villager`                       | `VillagerMetadataSection`                                     | `.png.mcmeta`（纹理）   | 村民帽子的可见性                                           |

:::note
模组主 `pack.mcmeta` 不需要 `PackMetadataSection`，因为 NeoForge 会合成生成该文件。不过，通过模组事件总线事件 [`AddPackFindersEvent`][events] 添加的内置资源包仍需要它。
:::

要获取元数据段中的数据，需要先从 `ResourceManager` 取得文件的 `Resource`，调用 `Resource#metadata` 取得 `ResourceMetadata`，然后用 `MetadataSectionType` 调用 `ResourceMetadata#getSection`。

```java
// 对于某个 `ResourceManager` resourceManager

// 取得最顶层资源的元数据
Optional<AnimationMetadataSection> waterStillMetadata = resourceManager.getResource(
    // Identifier 必须精确指定底层资源的路径。
    Identifier.fromNamespaceAndPath("minecraft", "textures/block/water_still.png")
).flatMap(resource -> {
    try {
        // 如果资源有元数据就返回它，否则返回空 optional。
        return resource.metadata().getSection(AnimationMetadataSection.TYPE);
    } catch (IOException e) {
        // 如果读取元数据文件时抛出异常。
        return Optional.empty();
    }
});

// 取得该 identifier 对应的每个资源的元数据
List<AnimationMetadataSection> waterStillsMetadata = resourceManager.getResourceStack(
    // Identifier 必须精确指定底层资源的路径。
    Identifier.fromNamespaceAndPath("minecraft", "textures/block/water_still.png")
).map(resource -> {
    try {
        // 如果资源有元数据就返回它，否则返回空 optional。
        return resource.metadata().getSection(AnimationMetadataSection.TYPE);
    } catch (IOException e) {
        // 如果读取元数据文件时抛出异常。
        return Optional.empty();
    }
}).filter(Optional::isPresent).map(Optional::get);
```

客户端 `ResourceManager` 可通过 `Minecraft#getResourceManager` 获取。服务端不会在 `MinecraftServer#reloadResources` 之外暴露 `ResourceManager`，因此只能在 `PreparableReloadListener` 中使用它。

### 自定义元数据段

自定义元数据段只需创建对象、用于序列化和反序列化对象的 `Codec`，以及从 `mcmeta` 读取数据的 `MetadataSectionType`。

```java
public record ExampleMetadataSection(String value) {
    public static final Codec<ExampleMetadataSection> CODEC = Codec.STRING.xmap(ExampleMetadataSection::new, ExampleMetadataSection::value);

    public static final MetadataSectionType<ExampleMetadataSection> TYPE = new MetadataSectionType<>(
        // .mcmeta 中该段的键，应带有你的模组 ID 前缀。
        "examplemod:example_section",
        // 用于序列化和反序列化该段数据的 codec。
        CODEC
    );
}
```

随后就可以把该元数据段添加到对象的 `.mcmeta` 中：

```json5
// 位于 'assets/examplemod/textures/block/example_block.png.mcmeta'
{
    "examplemod:example_section": "Hello world!"
}
```

之后也能使用该类型像读取其他任意元数据段一样读取它。

## 数据生成

原版通过 `PackMetadataGenerator` 为 `pack.mcmeta` 提供数据生成。其他文件的元数据则需要自定义 `DataProvider`。

### `PackMetadataGenerator` {#packmetadatagenerator}

`PackMetadataGenerator` 用于为模组或其内置子包生成 `pack.mcmeta`。通过 `add` 方法添加元数据段，传入 `MetadataSectionType` 及其值。`PackMetadataGenerator` 还提供 `forFeaturePack`，用于生成带 `PackMetadataSection` 及可选 `FeatureFlagsMetadataSection` 的 `pack.mcmeta`：

```java
@SubscribeEvent // 在模组事件总线上
public static void gatherData(GatherDataEvent.Client event) {
    event.createProvider(PackMetadataGenerator::new)
        // 可以链式调用多个 `add`。
        .add(
            // 要添加的元数据段。
            LanguageMetadataSection.TYPE,
            // 元数据段的值。
            Map.of(
                "hello_world",
                new LanguageInfo(
                    "Programmer's Land",
                    "Hello world!",
                    false
                )
            )
        );
}
```

### 其他资源元数据

为其他文件生成资源元数据需要自定义 `DataProvider`：

```java
public class ResourceMetadataProvider implements DataProvider {

    private final PackOutput output;
    private final Map<Path, ResourceMetadata> metadata;

    public ResourceMetadataProvider(PackOutput output) {
        this.output = output;
        this.metadata = new HashMap<>();
    }

    protected void add() {
        // 在此添加元数据。
        this.textureMetadata(Identifier.fromNamespaceAndPath(
            "examplemod", "block/example_texture"
        ))
            // 可以链式调用多个 `add`。
            .add(
                // 要添加的元数据段。
                TextureMetadataSection.TYPE
                // 元数据段的值。
                new TextureMetadataSection(
                    true, TextureMetadataSection.DEFAULT_CLAMP, MipmapStrategy.AUTO, TextureMetadataSection.DEFAULT_ALPHA_CUTOFF_BIAS
                )
            ).add(
                ExampleMetadataSection.TYPE,
                new ExampleMetadataSection("Hello world!")
            );
    }

    protected ResourceMetadata textureMetadata(Identifier resource) {
        return this.metadata(
            PackOutput.Target.RESOURCE_PACK,
            "textures",
            resource.withSuffix(".png")
        );
    }

    protected ResourceMetadata metadata(PackOutput.Target type, String directory, Identifier resource) {
        return this.metadata.computeIfAbsent(
            this.output.createPathProvider(type, directory).file(resource, "mcmeta"),
            p -> new ResourceMetadata()
        );
    }

    @Override
    public CompletableFuture<?> run(CachedOutput cache) {
        Executor executor = Util.backgroundExecutor().forName("serializeMetadata");
        return CompletableFuture.allOf(
            this.metadata.entrySet().stream().map(entry -> CompletableFuture.runAsync(() -> {
                    JsonObject result = new JsonObject();
                    entry.getValue().sections().forEach((type, data) -> result.add(type, data.get()));
                    return result;
                }, executor).thenComposeAsync(json -> DataProvider.saveStable(cache, json, entry.getKey()), executor)
            ).toArray(CompletableFuture[]::new)
        );
    }

    @Override
    public final String getName() {
        return "Resource Metadata";
    }

    public record ResourceMetadata(Map<String, Supplier<JsonElement>> sections) {

        public ResourceMetadata() {
            this(new HashMap<>());
        }

        public <T> ResourceMetadata add(MetadataSectionType<T> type, T value) {
            this.sections.put(type.name(), () -> type.codec().encodeStart(JsonOps.INSTANCE, value).getOrThrow(IllegalArgumentException::new).getAsJsonObject());
            return this;
        }
    }
}
```

随后把它添加到 `GatherDataEvent`：

```java
@SubscribeEvent // 在模组事件总线上
public static void gatherData(GatherDataEvent.Client event) {
    event.createProvider(ResourceMetadataProvider::new);
}
```

[animation]: client/textures.md#animated-textures
[codec]: ../datastorage/codecs.md
[events]: ../concepts/events.md
[features]: ../advanced/featureflags.md#feature-packs
[pack]: index.md#packmcmeta
[texture]: client/textures.md#texture-metadata
