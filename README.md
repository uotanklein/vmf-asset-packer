# Source Asset Toolkit

Локальный Windows-инструмент для двух сценариев работы с ассетами Source / Garry's Mod:

- `vmf-pack`: собрать ассеты, на которые ссылаются один или несколько VMF, в выходную папку.
- `content-pack`: объединить библиотеку контента по аддонам, разрешить дубликаты внутренних путей и разложить победителей по группам.

UI работает через localhost, а helper-сервер читает локальные папки напрямую. Ничего не отправляется на удалённый сервер.

## Возможности

- Сбор ассетов из VMF по нескольким папкам контента.
- Режим объединения контента с группами, правилами и fallback-поведением прямо в интерфейсе.
- Необязательное пережатие звуков и VTF только для `content-pack`.
- Очистка output с защитными проверками.
- CLI-режим для локальных сценариев и автоматизации.
- Веб-интерфейс с потоковым прогрессом через server-sent events.

## Требования

- Windows
- Node.js
- Необязательно: `bin/source_asset_tracer.exe` для режима `vmf-pack` при трассировке зависимостей `.mdl` и `.vmt`

## Установка

```powershell
npm install
```

## Структура workspace

По умолчанию инструмент теперь использует такую локальную структуру:

- `workspace/01_vmf_maps` — VMF-файлы для режима `vmf-pack`
- `workspace/02_vmf_content_root` — loose-контент, по которому ищутся ассеты для `vmf-pack`
- `workspace/03_vmf_pack_output` — результат режима `vmf-pack`
- `workspace/04_addons_source` — исходные папки аддонов для режима `content-pack`
- `workspace/05_addons_merged` — дедуплицированный и объединённый результат `content-pack`
- `workspace/06_content_split` — результат режима `content-split`

Такой layout позволяет пройти весь процесс по стадиям без ручной путаницы между `content`, `output`, `maps` и промежуточными результатами.

## Веб-интерфейс

```powershell
npm run dev:web
```

Открой [http://127.0.0.1:5780/](http://127.0.0.1:5780/).

Если порт занят:

```powershell
$env:PORT = "5781"
npm run dev:web
```

### `vmf-pack`

1. Выбери один или несколько VMF-файлов.
2. Добавь одну или несколько папок контента.
3. При необходимости скорректируй список расширений и ключей.
4. Выбери output и при желании включи его очистку.
5. Запусти задачу.

### `content-pack`

1. Выбери одну или несколько папок контента.
   Обычно это `workspace/04_addons_source` и, при необходимости, `workspace/03_vmf_pack_output`.
2. Добавь группы вывода.
3. Настрой правила сопоставления аддонов прямо в интерфейсе.
4. Настрой fallback для нераспознанных аддонов.
5. При необходимости включи пережатие звуков и/или VTF.
6. Выбери output и запусти задачу.

## CLI

Оба режима используют общий CLI-вход.

### `vmf-pack`

```powershell
$env:RUN_MODE = "vmf-pack"
$env:VMF_PATHS = "E:\maps\example_a.vmf;E:\maps\example_b.vmf"
$env:OUTPUT_PATH = "E:\packed-map"
$env:CONTENT_ROOTS = "F:\steam\steamapps\common\GarrysMod\garrysmod;E:\gmod-content"
$env:CLEAN_OUTPUT = "1"
$env:SOURCE_ASSET_TRACER_PATH = "E:\tools\source_asset_tracer.exe"
npm run dev:cli
```

`CONTENT_ROOTS` задаётся через `;`.

`SOURCE_ASSET_TRACER_PATH` необязателен. Если его не указать, инструмент ищет `bin/source_asset_tracer.exe`.

### `content-pack`

Для CLI JSON-правила по-прежнему поддерживаются.

```powershell
$env:RUN_MODE = "content-pack"
$env:PACK_CONTENT_DIRS = "E:\content\all-addons;E:\content\vmf-pack-output"
$env:PACK_RULES_PATH = "E:\prog\vmf-asset-packer\examples\qanon-content-pack.rules.json"
$env:OUTPUT_PATH = "E:\content\packed"
$env:CLEAN_OUTPUT = "1"
$env:COMPRESS_SOUNDS = "1"
$env:COMPRESS_VTF = "1"
$env:FFMPEG_PATH = "E:\tools\ffmpeg.exe"
$env:VTFCMD_PATH = "E:\tools\VTFCmd.exe"
npm run dev:cli
```

`PACK_CONTENT_DIRS` можно передать и как `CONTENT_DIRS`. Список путей задаётся через `;`.

Для обратной совместимости можно по-прежнему передать один путь через `PACK_CONTENT_DIR` или `CONTENT_DIR`.

`PACK_RULES_PATH` можно передать и как `RULES_PATH`.

Переменные окружения для необязательной пост-обработки:

- `COMPRESS_SOUNDS=1` включает пережатие `.wav`, `.mp3` и `.ogg` в выходной папке.
- `COMPRESS_VTF=1` включает пережатие `.vtf` в выходной папке.
- `FFMPEG_PATH` переопределяет поиск `ffmpeg`.
- `VTFCMD_PATH` или `VTF_CMD_PATH` переопределяет поиск `VTFCmd.exe`.
- Если явный путь пуст, инструмент сначала смотрит env-переменные, потом проектную `bin/`, потом системный `PATH`.

## Формат правил для CLI

В CLI-файле правил используются:

- `groups`: список групп вывода.
- `rules`: список правил сопоставления аддонов.
- `unmatched`: fallback для аддонов без совпавшего правила.

Минимальный пример:

```json
{
  "groups": [
    {
      "id": "core",
      "folder": "01_core",
      "displayName": "Core"
    },
    {
      "id": "optional",
      "folder": "02_optional",
      "displayName": "Optional"
    }
  ],
  "unmatched": {
    "action": "skip"
  },
  "rules": [
    {
      "match": { "addonName": "my_required_addon_123" },
      "action": "pack",
      "groupId": "core",
      "priority": 1000
    },
    {
      "match": { "addonNamePattern": "^optional_" },
      "action": "pack",
      "groupId": "optional",
      "priority": 200
    },
    {
      "match": { "addonName": "logs" },
      "action": "skip"
    }
  ]
}
```

Правила проверяются сверху вниз. Если несколько аддонов дают один и тот же внутренний путь, победитель определяется по:

1. `priority`
2. меньшей глубине пути
3. большему размеру файла
4. лексикографически меньшему имени аддона

## Пример

Мигрированные правила из старого скрипта лежат здесь:

- [examples/qanon-content-pack.rules.json](examples/qanon-content-pack.rules.json)

Их можно использовать как стартовую точку для CLI или как образец логики, которую затем удобнее перенести в UI.

## Примечания

- `content-pack` работает только с loose-файлами. GMA/VPK-архивы он не индексирует.
- `content-pack` запрещает использовать output, совпадающий с папкой контента или вложенный в неё.
- Пережатие звуков и VTF не относится к `vmf-pack` и применяется только после `content-pack`.
- Встроенные бинарники можно положить в `bin/`, тогда UI и CLI смогут подхватывать их без явного пути.
- Защитные проверки очистки запрещают опасные случаи вроде корня диска или output-папки, внутри которой находятся защищённые входные данные.
