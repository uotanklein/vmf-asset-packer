<h1 align="center">
  Source Asset Toolkit
</h1>
<p align="center">
  <img src="https://i.imgur.com/P9L5wrv.png" alt="Logo" style="width:50%; height:auto;">
</p>

Локальный Windows-инструмент для работы с ассетами Source / Garry's Mod.

Поддерживает три режима:

- `vmf-pack` — собрать ассеты, на которые ссылаются один или несколько `VMF`, в выходную папку.
- `content-pack` — объединить loose-контент из нескольких источников, разрешить дубликаты и разложить победителей по группам.
- `content-split` — разделить уже собранный контент на части по лимиту размера.

UI работает через localhost, а helper-сервер читает локальные папки напрямую. Ничего не отправляется на удалённые серверы.

## Возможности

- Выбор нескольких `VMF` в одном запуске `vmf-pack`.
- Несколько папок контента для `vmf-pack` и `content-pack`.
- Настройка групп, правил и fallback для `content-pack` прямо в интерфейсе.
- Drag-and-drop для порядка групп и правил.
- Опциональное пережатие звуков и `VTF` только после `content-pack`.
- Защищённая очистка output-папок.
- CLI-режим для локальных сценариев и автоматизации.
- Веб-интерфейс с потоковым прогрессом через SSE.

## Требования

- Windows
- Node.js
- Необязательно: `bin/source_asset_tracer.exe` для режима `vmf-pack`, если нужна трассировка зависимостей `.mdl` и `.vmt`

## Установка

```powershell
npm install
```

## Структура workspace

По умолчанию проект использует такую локальную структуру:

- `workspace/01_vmf_maps` — `VMF`-файлы для `vmf-pack`
- `workspace/02_vmf_content_root` — loose-контент, по которому ищутся ассеты для `vmf-pack`
- `workspace/03_vmf_pack_output` — результат `vmf-pack`
- `workspace/04_addons_source` — исходные папки аддонов для `content-pack`
- `workspace/05_addons_merged` — объединённый и дедуплицированный результат `content-pack`
- `workspace/06_content_split` — результат `content-split`

Такой layout позволяет пройти весь пайплайн по стадиям:

1. `VMF` и контент карты
2. упаковка ссылок из карт
3. объединение с аддонами
4. деление итогового контента по размеру

## Веб-интерфейс

```powershell
npm run dev:web
```

По умолчанию сервер поднимается на [http://127.0.0.1:5781/](http://127.0.0.1:5781/).

Если порт занят:

```powershell
$env:PORT = "5782"
npm run dev:web
```

### `vmf-pack`

1. Выбери один или несколько `VMF`-файлов.
2. Добавь одну или несколько папок контента.
3. При необходимости скорректируй список расширений и ключей.
4. Выбери output и, если нужно, включи его очистку.
5. Запусти задачу.

### `content-pack`

1. Выбери одну или несколько папок контента.
   Обычно это `workspace/04_addons_source` и, при необходимости, `workspace/03_vmf_pack_output`.
2. Настрой группы вывода.
3. Настрой правила сопоставления аддонов.
4. Настрой fallback для нераспознанных аддонов.
5. При необходимости включи пережатие звуков и/или `VTF`.
6. Выбери output и запусти задачу.

Примечание:
- группы и правила в UI сделаны как прокручиваемые списки;
- порядок правил важен, его можно менять перетаскиванием.

### `content-split`

1. Выбери папку с результатом `content-pack`.
2. Задай лимит размера на одну часть.
3. При необходимости включи очистку исходных групп после разбиения.
4. Выбери output и запусти задачу.

## CLI

Все режимы используют общий CLI-вход.

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

Примечания:

- `VMF_PATHS` задаётся через `;`
- для обратной совместимости можно передать один путь через `VMF_PATH`
- `CONTENT_ROOTS` тоже задаётся через `;`
- `SOURCE_ASSET_TRACER_PATH` необязателен; если он не указан, тул ищет `bin/source_asset_tracer.exe`

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

Примечания:

- `PACK_CONTENT_DIRS` можно передать и как `CONTENT_DIRS`
- список путей задаётся через `;`
- для обратной совместимости можно использовать один путь через `PACK_CONTENT_DIR` или `CONTENT_DIR`
- `PACK_RULES_PATH` можно передать и как `RULES_PATH`

Переменные окружения для пост-обработки:

- `COMPRESS_SOUNDS=1` включает пережатие `.wav`, `.mp3`, `.ogg`
- `COMPRESS_VTF=1` включает пережатие `.vtf`
- `FFMPEG_PATH` переопределяет поиск `ffmpeg`
- `VTFCMD_PATH` или `VTF_CMD_PATH` переопределяет поиск `VTFCmd.exe`
- если путь не задан, инструмент сначала смотрит env, потом `bin/`, потом системный `PATH`

### `content-split`

```powershell
$env:RUN_MODE = "content-split"
$env:SPLIT_INPUT_PATH = "E:\prog\vmf-asset-packer\workspace\05_addons_merged"
$env:SPLIT_OUTPUT_PATH = "E:\prog\vmf-asset-packer\workspace\06_content_split"
$env:SPLIT_LIMIT_GB = "2"
$env:CLEAN_SOURCE_GROUPS = "0"
npm run dev:cli
```

Примечания:

- `SPLIT_LIMIT_GB` задаёт лимит на одну часть
- `CLEAN_SOURCE_GROUPS=0` отключает очистку исходных групп после разбиения

## Формат правил для CLI

В CLI JSON-файле правил используются:

- `groups` — список групп вывода
- `rules` — список правил сопоставления аддонов
- `unmatched` — fallback для аддонов без совпавшего правила

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

Их можно использовать как стартовую точку для CLI или как образец логики перед переносом правил в UI.

## Примечания

- `content-pack` работает только с loose-файлами; `GMA`/`VPK` не индексируются
- `content-pack` запрещает использовать output, совпадающий с папкой контента или вложенный в неё
- пережатие звуков и `VTF` не относится к `vmf-pack` и применяется только после `content-pack`
- встроенные бинарники можно положить в `bin/`, тогда UI и CLI смогут подхватывать их без явного пути
- защитные проверки очистки запрещают опасные случаи вроде корня диска, `workspace`-корня или output-папки вне рабочей зоны
