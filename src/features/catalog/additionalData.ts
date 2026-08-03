import type { CatalogPlant } from "./types";

type AdditionalPlant = Omit<CatalogPlant, "unsplashId" | "source">;

function editorialPlant(plant: AdditionalPlant): CatalogPlant {
  return { ...plant, unsplashId: "", source: "local" };
}

// Дополнительные востребованные растения хранятся локально и доступны офлайн.
// Пустой unsplashId намеренный: лучше показать эмодзи, чем неверное фото сорта.
export const ADDITIONAL_CATALOG: CatalogPlant[] = [
  editorialPlant({
    id: "calathea-white-fusion", name: "Калатея Вайт Фьюжн", latinName: "Goeppertia lietzei 'White Fusion'", emoji: "🌿", difficulty: "hard",
    watering: { summer: 5, winter: 8 }, tropical: true, needsMisting: true,
    description: "Коллекционная калатея с бело-зелёной вариегатностью и лиловой изнанкой листьев.",
    careTip: "Держите в ярком рассеянном свете, высокой влажности и тепле без сквозняков. Используйте мягкую воду.",
    diseases: ["Паутинный клещ", "Подсыхание краёв", "Корневая гниль"], seasonalTips: ["Зимой защищайте от холодного стекла", "Весной проверяйте корни перед пересадкой"],
    tags: ["комнатный", "калатея", "геппертия", "вайт фьюжн", "вариегатный", "тропический"],
  }),
  editorialPlant({
    id: "calathea-orbifolia", name: "Калатея орбифолия", latinName: "Goeppertia orbifolia", emoji: "🌿", difficulty: "hard",
    watering: { summer: 5, winter: 9 }, tropical: true, needsMisting: true,
    description: "Крупнолистная калатея с широкими серебристо-зелёными полосами.", careTip: "Обеспечьте стабильную влажность воздуха и рассеянный свет; не оставляйте воду в поддоне.",
    diseases: ["Паутинный клещ", "Сухие края листьев", "Корневая гниль"], seasonalTips: ["Летом притеняйте от прямого солнца", "Зимой сократите полив"], tags: ["комнатный", "калатея", "геппертия", "орбифолия", "крупнолистный"],
  }),
  editorialPlant({
    id: "calathea-makoyana", name: "Калатея Макоя", latinName: "Goeppertia makoyana", emoji: "🌿", difficulty: "medium",
    watering: { summer: 5, winter: 9 }, tropical: true, needsMisting: true,
    description: "Узорчатое растение с полупрозрачными листьями и бордовой изнанкой.", careTip: "Поливайте мягкой водой после лёгкого подсыхания верхнего слоя и поддерживайте ровное тепло.",
    diseases: ["Паутинный клещ", "Пятнистость листьев", "Корневая гниль"], seasonalTips: ["Весной можно делить взрослый куст", "Зимой исключите сквозняки"], tags: ["комнатный", "калатея", "геппертия", "макоя", "молитвенное растение"],
  }),
  editorialPlant({
    id: "calathea-medallion", name: "Калатея Медальон", latinName: "Goeppertia roseopicta 'Medallion'", emoji: "🌿", difficulty: "hard",
    watering: { summer: 5, winter: 9 }, tropical: true, needsMisting: true,
    description: "Сорт с округлыми листьями, серебристым рисунком и пурпурной изнанкой.", careTip: "Избегайте прямого солнца, жёсткой воды и резких перепадов температуры.",
    diseases: ["Паутинный клещ", "Сухие кончики", "Пятнистость"], seasonalTips: ["Летом поддерживайте повышенную влажность", "Зимой не ставьте рядом с батареей"], tags: ["комнатный", "калатея", "геппертия", "медальон", "декоративнолистный"],
  }),
  editorialPlant({
    id: "calathea-beauty-star", name: "Калатея Бьюти Стар", latinName: "Goeppertia ornata 'Beauty Star'", emoji: "🌿", difficulty: "hard",
    watering: { summer: 5, winter: 9 }, tropical: true, needsMisting: true,
    description: "Стройная калатея с тонкими светлыми и розоватыми полосами на листьях.", careTip: "Поддерживайте влажный воздух, но вентиляцию вокруг листьев; поливайте мягкой тёплой водой.",
    diseases: ["Паутинный клещ", "Трипсы", "Корневая гниль"], seasonalTips: ["Весной обновите верхний слой грунта", "Зимой увеличьте дистанцию от отопления"], tags: ["комнатный", "калатея", "геппертия", "бьюти стар", "полосатый"],
  }),
  editorialPlant({
    id: "calathea-freddie", name: "Калатея Фредди", latinName: "Goeppertia concinna 'Freddie'", emoji: "🌿", difficulty: "medium",
    watering: { summer: 5, winter: 9 }, tropical: true, needsMisting: true,
    description: "Компактная калатея со светлыми листьями и контрастным перистым рисунком.", careTip: "Выберите место без прямых лучей и следите, чтобы субстрат не пересыхал полностью.",
    diseases: ["Паутинный клещ", "Сухие края", "Загнивание корней"], seasonalTips: ["Летом чаще контролируйте влажность", "Зимой уменьшите частоту подкормок"], tags: ["комнатный", "калатея", "геппертия", "фредди", "компактный"],
  }),
  editorialPlant({
    id: "calathea-rattlesnake", name: "Калатея лансифолия", latinName: "Goeppertia insignis", emoji: "🌿", difficulty: "medium",
    watering: { summer: 5, winter: 9 }, tropical: true, needsMisting: true,
    description: "Калатея с длинными волнистыми листьями, тёмными пятнами и бордовой изнанкой.", careTip: "Поставьте в рассеянный свет и используйте рыхлый влагоёмкий субстрат с хорошим дренажем.",
    diseases: ["Паутинный клещ", "Трипсы", "Корневая гниль"], seasonalTips: ["Весной пересаживайте только при освоенном горшке", "Зимой берегите от холода"], tags: ["комнатный", "калатея", "геппертия", "лансифолия", "инсигнис"],
  }),
  editorialPlant({
    id: "calathea-warscewiczii", name: "Калатея Варшевича", latinName: "Goeppertia warszewiczii", emoji: "🌿", difficulty: "hard",
    watering: { summer: 5, winter: 9 }, tropical: true, needsMisting: true,
    description: "Бархатистая калатея с тёмным рисунком и пурпурной изнанкой листьев.", careTip: "Нуждается в стабильном тепле, высокой влажности и мягкой воде без застоя у корней.",
    diseases: ["Паутинный клещ", "Подсыхание листьев", "Корневая гниль"], seasonalTips: ["Летом защищайте от солнца", "Зимой не допускайте холодного воздуха"], tags: ["комнатный", "калатея", "геппертия", "варшевича", "бархатный"],
  }),
  editorialPlant({
    id: "spathiphyllum-picasso", name: "Спатифиллум Пикассо", latinName: "Spathiphyllum 'Picasso'", emoji: "🤍", difficulty: "medium",
    watering: { summer: 5, winter: 9 }, tropical: true, needsMisting: true,
    description: "Вариегатный спатифиллум с крупными белыми секторами на листьях.", careTip: "Дайте больше рассеянного света, чем зелёным сортам, но исключите прямое полуденное солнце.",
    diseases: ["Корневая гниль", "Паутинный клещ", "Позеленение вариегатности"], seasonalTips: ["Весной внесите слабую подкормку", "Зимой сократите полив"], tags: ["комнатный", "спатифиллум", "пикассо", "вариегатный", "цветущий"],
  }),
  editorialPlant({
    id: "spathiphyllum-domino", name: "Спатифиллум Домино", latinName: "Spathiphyllum 'Domino'", emoji: "🤍", difficulty: "easy",
    watering: { summer: 5, winter: 9 }, tropical: true, needsMisting: true,
    description: "Пёстрый спатифиллум с белыми штрихами по зелёным листьям.", careTip: "Поддерживайте умеренно влажный субстрат и яркий рассеянный свет для сохранения рисунка.",
    diseases: ["Корневая гниль", "Щитовка", "Сухие кончики"], seasonalTips: ["Весной удаляйте старые цветоносы", "Зимой не переувлажняйте"], tags: ["комнатный", "спатифиллум", "домино", "вариегатный", "цветущий"],
  }),
  editorialPlant({
    id: "spathiphyllum-sensation", name: "Спатифиллум Сенсейшн", latinName: "Spathiphyllum 'Sensation'", emoji: "🤍", difficulty: "easy",
    watering: { summer: 5, winter: 10 }, tropical: true, needsMisting: true,
    description: "Крупный сорт с рельефными тёмно-зелёными листьями для просторных помещений.", careTip: "Оставьте место для роста, обеспечьте рассеянный свет и очищайте крупные листья от пыли.",
    diseases: ["Корневая гниль", "Щитовка", "Паутинный клещ"], seasonalTips: ["Весной проверьте устойчивость горшка", "Зимой держите вдали от батареи"], tags: ["комнатный", "спатифиллум", "сенсейшн", "крупномер", "цветущий"],
  }),
  editorialPlant({
    id: "spathiphyllum-chopin", name: "Спатифиллум Шопен", latinName: "Spathiphyllum 'Chopin'", emoji: "🤍", difficulty: "easy",
    watering: { summer: 5, winter: 9 }, tropical: true, needsMisting: true,
    description: "Компактный обильно цветущий сорт с аккуратной розеткой листьев.", careTip: "Удаляйте отцветшие цветоносы у основания и не допускайте длительного застоя воды.",
    diseases: ["Корневая гниль", "Мучнистый червец", "Сухие кончики"], seasonalTips: ["Весной начните регулярные слабые подкормки", "Зимой дайте растению отдохнуть"], tags: ["комнатный", "спатифиллум", "шопен", "компактный", "цветущий"],
  }),
  editorialPlant({
    id: "rose-peace", name: "Роза Пис", latinName: "Rosa 'Peace'", emoji: "🌹", difficulty: "medium",
    watering: { summer: 4, winter: 18 }, tropical: false, needsMisting: false,
    description: "Классическая чайно-гибридная роза с крупными жёлто-розовыми цветками.", careTip: "Высаживайте на солнечном проветриваемом месте и поливайте под корень; учитывайте зимостойкость вашего региона.",
    diseases: ["Чёрная пятнистость", "Мучнистая роса", "Тля"], seasonalTips: ["Весной проведите санитарную обрезку", "Осенью подготовьте к зимовке по климату"], tags: ["роза", "садовый", "участок", "чайно-гибридная", "пис"],
  }),
  editorialPlant({
    id: "rose-iceberg", name: "Роза Айсберг", latinName: "Rosa 'Iceberg'", emoji: "🌹", difficulty: "medium",
    watering: { summer: 4, winter: 18 }, tropical: false, needsMisting: false,
    description: "Популярная флорибунда с многочисленными белыми цветками и повторным цветением.", careTip: "Обеспечьте солнце, циркуляцию воздуха и своевременно удаляйте отцветшие соцветия.",
    diseases: ["Чёрная пятнистость", "Мучнистая роса", "Тля"], seasonalTips: ["Весной проредите центр куста", "Летом удаляйте отцветшие кисти"], tags: ["роза", "садовый", "участок", "флорибунда", "айсберг", "белая"],
  }),
  editorialPlant({
    id: "rose-new-dawn", name: "Роза Нью Доун", latinName: "Rosa 'New Dawn'", emoji: "🌹", difficulty: "medium",
    watering: { summer: 4, winter: 18 }, tropical: false, needsMisting: false,
    description: "Сильнорослая плетистая роза с нежно-розовыми повторно цветущими бутонами.", careTip: "Закрепляйте побеги веером на прочной опоре и направляйте основные ветви ближе к горизонтали.",
    diseases: ["Чёрная пятнистость", "Мучнистая роса", "Тля"], seasonalTips: ["Весной подвяжите сохранившиеся плети", "После цветения укоротите боковые побеги"], tags: ["роза", "садовый", "участок", "плетистая", "нью доун", "опора"],
  }),
  editorialPlant({
    id: "rose-graham-thomas", name: "Роза Грэхам Томас", latinName: "Rosa 'Graham Thomas'", emoji: "🌹", difficulty: "medium",
    watering: { summer: 4, winter: 18 }, tropical: false, needsMisting: false,
    description: "Английская кустовая роза с чашевидными насыщенно-жёлтыми цветками.", careTip: "Выберите солнечное место с плодородной дренированной почвой и оставьте кусту пространство для проветривания.",
    diseases: ["Чёрная пятнистость", "Мучнистая роса", "Тля"], seasonalTips: ["Весной формируйте куст умеренно", "Летом удаляйте отцветшие бутоны"], tags: ["роза", "садовый", "участок", "английская", "шраб", "грэхам томас"],
  }),
  editorialPlant({
    id: "rose-gertrude-jekyll", name: "Роза Гертруда Джекилл", latinName: "Rosa 'Gertrude Jekyll'", emoji: "🌹", difficulty: "medium",
    watering: { summer: 4, winter: 18 }, tropical: false, needsMisting: false,
    description: "Ароматная английская роза с густомахровыми ярко-розовыми цветками.", careTip: "Для обильного цветения нужны солнце, питание и регулярное удаление отцветших цветков.",
    diseases: ["Чёрная пятнистость", "Мучнистая роса", "Тля"], seasonalTips: ["Весной удалите слабые и повреждённые ветви", "Осенью прекратите азотные подкормки"], tags: ["роза", "садовый", "участок", "английская", "ароматная", "гертруда джекилл"],
  }),
  editorialPlant({
    id: "rose-the-fairy", name: "Роза Зе Фейри", latinName: "Rosa 'The Fairy'", emoji: "🌹", difficulty: "easy",
    watering: { summer: 5, winter: 18 }, tropical: false, needsMisting: false,
    description: "Невысокая почвопокровная роза с многочисленными мелкими розовыми цветками.", careTip: "Подходит для бордюров и склонов; удаляйте старые ветви и обеспечьте солнце или лёгкую полутень.",
    diseases: ["Чёрная пятнистость", "Тля", "Пилильщик"], seasonalTips: ["Весной вырежьте старые побеги", "Летом контролируйте загущение"], tags: ["роза", "садовый", "участок", "почвопокровная", "зе фейри", "бордюр"],
  }),
  editorialPlant({
    id: "rose-bonica-82", name: "Роза Боника 82", latinName: "Rosa 'Bonica 82'", emoji: "🌹", difficulty: "easy",
    watering: { summer: 5, winter: 18 }, tropical: false, needsMisting: false,
    description: "Надёжная ландшафтная роза с волнами нежно-розовых цветков.", careTip: "Высаживайте группами на солнце, не загущайте и поливайте утром под корень.",
    diseases: ["Чёрная пятнистость", "Тля", "Розанный пилильщик"], seasonalTips: ["Весной проведите санитарную обрезку", "Летом удаляйте осыпавшиеся кисти"], tags: ["роза", "садовый", "участок", "ландшафтная", "боника", "флорибунда"],
  }),
  editorialPlant({
    id: "rose-hansa", name: "Роза ругоза Ханса", latinName: "Rosa rugosa 'Hansa'", emoji: "🌹", difficulty: "easy",
    watering: { summer: 6, winter: 20 }, tropical: false, needsMisting: false,
    description: "Выносливая морщинистая роза с ароматными пурпурными цветками и крупными плодами.", careTip: "Подходит для свободной живой изгороди; контролируйте корневую поросль и не перекармливайте.",
    diseases: ["Тля", "Ржавчина", "Розанный пилильщик"], seasonalTips: ["Весной удалите старые ветви", "Осенью можно оставить плоды для декоративности"], tags: ["роза", "садовый", "участок", "ругоза", "ханса", "морозостойкий", "живая изгородь"],
  }),
  editorialPlant({
    id: "rose-miniature", name: "Роза миниатюрная", latinName: "Rosa Miniature Group", emoji: "🌹", difficulty: "medium",
    watering: { summer: 4, winter: 12 }, tropical: false, needsMisting: false,
    description: "Группа компактных роз для контейнеров, бордюров и сезонного выращивания на балконе.", careTip: "После покупки обеспечьте максимум света и прохладный свежий воздух; в комнате растение часто страдает от жары.",
    diseases: ["Паутинный клещ", "Мучнистая роса", "Чёрная пятнистость"], seasonalTips: ["Весной постепенно приучайте к открытому воздуху", "Зимовку выбирайте с учётом сорта и климата"], tags: ["роза", "садовый", "комнатный", "миниатюрная", "контейнер", "балкон"],
  }),
  editorialPlant({
    id: "maranta-fascinator", name: "Маранта Фасцинатор Триколор", latinName: "Maranta leuconeura 'Fascinator Tricolor'", emoji: "🌿", difficulty: "medium",
    watering: { summer: 5, winter: 9 }, tropical: true, needsMisting: true, description: "Молитвенное растение с красными жилками и контрастными пятнами.", careTip: "Держите в рассеянном свете, мягком тепле и влажном воздухе; не пересушивайте полностью.", diseases: ["Паутинный клещ", "Сухие края", "Корневая гниль"], seasonalTips: ["Весной можно укоренять черенки", "Зимой поливайте реже"], tags: ["комнатный", "маранта", "фасцинатор", "триколор", "молитвенное растение"],
  }),
  editorialPlant({
    id: "stromanthe-triostar", name: "Строманта Триостар", latinName: "Stromanthe sanguinea 'Triostar'", emoji: "🌿", difficulty: "hard",
    watering: { summer: 5, winter: 9 }, tropical: true, needsMisting: true, description: "Яркое тропическое растение с кремово-розово-зелёными листьями.", careTip: "Нужны высокая влажность, стабильное тепло и яркий рассеянный свет без прямых лучей.", diseases: ["Паутинный клещ", "Сухие края", "Корневая гниль"], seasonalTips: ["Летом следите за перегревом", "Зимой защищайте от сухого воздуха"], tags: ["комнатный", "строманта", "триостар", "вариегатный", "тропический"],
  }),
  editorialPlant({
    id: "ctenanthe-amagris", name: "Ктенанта Амагрис", latinName: "Ctenanthe burle-marxii 'Amagris'", emoji: "🌿", difficulty: "medium",
    watering: { summer: 5, winter: 9 }, tropical: true, needsMisting: true, description: "Компактная ктенанта с серебристыми листьями и рисунком «рыбья кость».", careTip: "Поддерживайте равномерную влажность и рассеянный свет, избегая холодного подоконника.", diseases: ["Паутинный клещ", "Сухие края", "Пятнистость"], seasonalTips: ["Весной делите только сильный куст", "Зимой сократите полив"], tags: ["комнатный", "ктенанта", "амагрис", "марантовые", "компактный"],
  }),
  editorialPlant({
    id: "philodendron-pink-princess", name: "Филодендрон Пинк Принцесс", latinName: "Philodendron erubescens 'Pink Princess'", emoji: "🌿", difficulty: "medium",
    watering: { summer: 7, winter: 12 }, tropical: true, needsMisting: false, description: "Коллекционный филодендрон с розовой секторной вариегатностью.", careTip: "Дайте опору и яркий рассеянный свет; не срезайте здоровые зелёные листья ради большей вариегатности.", diseases: ["Трипсы", "Паутинный клещ", "Корневая гниль"], seasonalTips: ["Весной закрепите новые побеги на опоре", "Зимой уменьшите полив"], tags: ["комнатный", "филодендрон", "пинк принцесс", "вариегатный", "ароидный"],
  }),
  editorialPlant({
    id: "philodendron-birkin", name: "Филодендрон Биркин", latinName: "Philodendron 'Birkin'", emoji: "🌿", difficulty: "easy",
    watering: { summer: 7, winter: 12 }, tropical: true, needsMisting: false, description: "Компактный филодендрон с тонкими кремовыми полосами на молодых листьях.", careTip: "Поставьте в яркий рассеянный свет и поворачивайте горшок для равномерного роста.", diseases: ["Трипсы", "Щитовка", "Корневая гниль"], seasonalTips: ["Весной обновите опору при необходимости", "Зимой берегите от перелива"], tags: ["комнатный", "филодендрон", "биркин", "полосатый", "ароидный"],
  }),
  editorialPlant({
    id: "alocasia-polly", name: "Алоказия Полли", latinName: "Alocasia × amazonica 'Polly'", emoji: "🌿", difficulty: "hard",
    watering: { summer: 6, winter: 11 }, tropical: true, needsMisting: true, description: "Компактная алоказия со стреловидными тёмными листьями и светлыми жилками.", careTip: "Держите в тепле, ярком рассеянном свете и рыхлом субстрате; зимой возможен период покоя.", diseases: ["Паутинный клещ", "Корневая гниль", "Пятнистость"], seasonalTips: ["Весной возобновляйте подкормки постепенно", "Зимой учитывайте замедление роста"], tags: ["комнатный", "алоказия", "полли", "ароидный", "тропический"],
  }),
  editorialPlant({
    id: "alocasia-frydek", name: "Алоказия Фрайдек", latinName: "Alocasia micholitziana 'Frydek'", emoji: "🌿", difficulty: "hard",
    watering: { summer: 6, winter: 11 }, tropical: true, needsMisting: true, description: "Алоказия с бархатистыми зелёными листьями и контрастными белыми жилками.", careTip: "Нужны тепло, высокая влажность и воздухопроницаемый субстрат без постоянной сырости.", diseases: ["Паутинный клещ", "Трипсы", "Корневая гниль"], seasonalTips: ["Летом притеняйте от полуденного солнца", "Зимой сократите полив при остановке роста"], tags: ["комнатный", "алоказия", "фрайдек", "бархатный", "ароидный"],
  }),
  editorialPlant({
    id: "begonia-maculata", name: "Бегония пятнистая", latinName: "Begonia maculata", emoji: "🌿", difficulty: "medium",
    watering: { summer: 6, winter: 10 }, tropical: true, needsMisting: false, description: "Тростниковая бегония с серебристыми точками и красной изнанкой листьев.", careTip: "Поливайте после подсыхания верхнего слоя, не смачивайте постоянно листья и прищипывайте для ветвления.", diseases: ["Мучнистая роса", "Корневая гниль", "Трипсы"], seasonalTips: ["Весной укоротите вытянувшиеся побеги", "Зимой обеспечьте хорошее освещение"], tags: ["комнатный", "бегония", "макулата", "пятнистая", "цветущий"],
  }),
  editorialPlant({
    id: "tradescantia-nanouk", name: "Традесканция Нанук", latinName: "Tradescantia 'Nanouk'", emoji: "🌿", difficulty: "easy",
    watering: { summer: 6, winter: 11 }, tropical: false, needsMisting: false, description: "Быстрорастущая традесканция с плотными розово-зелёными полосатыми листьями.", careTip: "Дайте яркий рассеянный свет, не оставляйте воду в розетках и регулярно прищипывайте побеги.", diseases: ["Корневая гниль", "Тля", "Паутинный клещ"], seasonalTips: ["Весной обновляйте растение черенками", "Зимой поставьте ближе к свету"], tags: ["комнатный", "традесканция", "нанук", "ампельный", "розовый"],
  }),
];
