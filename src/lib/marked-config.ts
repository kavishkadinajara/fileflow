/**
 * Shared marked configuration with syntax highlighting + emoji support.
 * Used by both server-side converters and client-side LivePreview.
 */
import hljs from "highlight.js";
import { marked } from "marked";
import { markedEmoji } from "marked-emoji";
import { markedHighlight } from "marked-highlight";

// ─── GitHub-style emoji shortcodes → Unicode ────────────────────────────────

const emojis: Record<string, string> = {
  // Smileys & Emotion
  smile: "😊", laughing: "😆", grinning: "😀", grin: "😁", joy: "😂",
  rofl: "🤣", smiley: "😃", wink: "😉", blush: "😊", heart_eyes: "😍",
  kissing_heart: "😘", thinking: "🤔", raised_eyebrow: "🤨", neutral_face: "😐",
  expressionless: "😑", unamused: "😒", rolling_eyes: "🙄", grimacing: "😬",
  relieved: "😌", pensive: "😔", sleepy: "😪", sleeping: "😴", mask: "😷",
  sunglasses: "😎", confused: "😕", worried: "😟", open_mouth: "😮",
  hushed: "😯", astonished: "😲", flushed: "😳", pleading_face: "🥺",
  cry: "😢", sob: "😭", angry: "😠", rage: "😡", swear: "🤬",
  skull: "💀", clown_face: "🤡", smiling_imp: "😈", ghost: "👻",
  alien: "👽", robot: "🤖", poop: "💩", scream: "😱", monocle_face: "🧐",
  nerd_face: "🤓", partying_face: "🥳", shushing_face: "🤫", zany_face: "🤪",
  yawning_face: "🥱", smirk: "😏", persevere: "😣", disappointed: "😞",
  sweat: "😓", weary: "😩", tired_face: "😫", fearful: "😨",

  // Gestures & People
  thumbsup: "👍", "+1": "👍", thumbsdown: "👎", "-1": "👎",
  clap: "👏", wave: "👋", raised_hands: "🙌", pray: "🙏",
  handshake: "🤝", muscle: "💪", point_up: "☝️", point_down: "👇",
  point_left: "👈", point_right: "👉", ok_hand: "👌", v: "✌️",
  crossed_fingers: "🤞", metal: "🤘", call_me_hand: "🤙", writing_hand: "✍️",
  eyes: "👀", brain: "🧠", heart: "❤️", orange_heart: "🧡",
  yellow_heart: "💛", green_heart: "💚", blue_heart: "💙", purple_heart: "💜",
  broken_heart: "💔", sparkling_heart: "💖", heartbeat: "💓", two_hearts: "💕",
  revolving_hearts: "💞", cupid: "💘", gift_heart: "💝", heart_decoration: "💟",
  love_letter: "💌", kiss: "💋", ring: "💍", gem: "💎",
  bouquet: "💐", couple_with_heart: "💑", wedding: "💒",

  // Nature & Animals
  dog: "🐶", cat: "🐱", mouse: "🐭", hamster: "🐹", rabbit: "🐰",
  fox_face: "🦊", bear: "🐻", panda_face: "🐼", koala: "🐨",
  tiger: "🐯", lion: "🦁", cow: "🐮", pig: "🐷", frog: "🐸",
  monkey_face: "🐵", see_no_evil: "🙈", hear_no_evil: "🙉", speak_no_evil: "🙊",
  chicken: "🐔", penguin: "🐧", bird: "🐦", eagle: "🦅",
  unicorn: "🦄", bee: "🐝", bug: "🐛", butterfly: "🦋",
  snail: "🐌", turtle: "🐢", snake: "🐍", octopus: "🐙",
  whale: "🐳", dolphin: "🐬", fish: "🐟", shark: "🦈",
  crab: "🦀", dragon: "🐉", t_rex: "🦖", sauropod: "🦕",

  // Food & Drink
  apple: "🍎", green_apple: "🍏", pear: "🍐", tangerine: "🍊",
  lemon: "🍋", banana: "🍌", watermelon: "🍉", grapes: "🍇",
  strawberry: "🍓", peach: "🍑", cherry: "🍒", mango: "🥭",
  avocado: "🥑", pizza: "🍕", hamburger: "🍔", fries: "🍟",
  hotdog: "🌭", taco: "🌮", burrito: "🌯", sushi: "🍣",
  egg: "🥚", coffee: "☕", tea: "🍵", beer: "🍺", wine_glass: "🍷",
  tropical_drink: "🍹", ice_cream: "🍦", cake: "🎂", cookie: "🍪",
  chocolate_bar: "🍫", candy: "🍬", popcorn: "🍿",

  // Activities & Objects
  fire: "🔥", star: "⭐", star2: "🌟", sparkles: "✨", zap: "⚡",
  boom: "💥", collision: "💥", droplet: "💧", sweat_drops: "💦",
  dash: "💨", cloud: "☁️", sun: "☀️", rainbow: "🌈",
  umbrella: "☂️", snowflake: "❄️", comet: "☄️", earth_americas: "🌎",
  rocket: "🚀", airplane: "✈️", helicopter: "🚁", car: "🚗",
  bus: "🚌", train: "🚆", ship: "🚢", anchor: "⚓",
  trophy: "🏆", medal_sports: "🏅", medal_military: "🎖️", first_place_medal: "🥇",
  second_place_medal: "🥈", third_place_medal: "🥉",
  soccer: "⚽", basketball: "🏀", football: "🏈", baseball: "⚾",
  tennis: "🎾", volleyball: "🏐", dart: "🎯", bowling: "🎳",
  video_game: "🎮", joystick: "🕹️", guitar: "🎸", musical_note: "🎵",
  notes: "🎶", microphone: "🎤", headphones: "🎧", art: "🎨",
  camera: "📷", movie_camera: "🎥", clapper: "🎬",

  // Symbols & UI
  check: "✅", white_check_mark: "✅", heavy_check_mark: "✔️",
  x: "❌", cross_mark: "❌", warning: "⚠️", exclamation: "❗",
  question: "❓", no_entry: "⛔", stop_sign: "🛑", forbidden: "🚫",
  construction: "🚧", lock: "🔒", unlock: "🔓", key: "🔑",
  bulb: "💡", mag: "🔍", mag_right: "🔎", bell: "🔔",
  no_bell: "🔕", mega: "📣", loudspeaker: "📢", mute: "🔇",
  speaker: "🔈", sound: "🔉", loud_sound: "🔊",
  link: "🔗", chains: "⛓️", wrench: "🔧", hammer: "🔨",
  nut_and_bolt: "🔩", gear: "⚙️", scissors: "✂️", pushpin: "📌",
  paperclip: "📎", pen: "🖊️", pencil2: "✏️", memo: "📝",
  book: "📖", books: "📚", notebook: "📓", bookmark: "🔖",
  label: "🏷️", inbox_tray: "📥", outbox_tray: "📤", email: "📧",
  envelope: "✉️", package: "📦", calendar: "📅", chart_with_upwards_trend: "📈",
  chart_with_downwards_trend: "📉", bar_chart: "📊", clipboard: "📋",
  file_folder: "📁", open_file_folder: "📂", wastebasket: "🗑️",

  // Flags & Misc
  flag_white: "🏳️", checkered_flag: "🏁", triangular_flag: "🚩",
  100: "💯", recycle: "♻️", infinity: "♾️", peace: "☮️",
  atom: "⚛️", yin_yang: "☯️",
  bangbang: "‼️", interrobang: "⁉️",
  new: "🆕", free: "🆓", up: "🆙", cool: "🆒", ok: "🆗",
  sos: "🆘", top: "🔝", end: "🔚", back: "🔙", on: "🔛", soon: "🔜",
  arrow_up: "⬆️", arrow_down: "⬇️", arrow_left: "⬅️", arrow_right: "➡️",
  arrow_upper_right: "↗️", arrow_lower_right: "↘️",
  arrow_upper_left: "↖️", arrow_lower_left: "↙️",
  repeat: "🔁", repeat_one: "🔂", arrows_counterclockwise: "🔄",
  twisted_rightwards_arrows: "🔀",
  heavy_plus_sign: "➕", heavy_minus_sign: "➖",
  heavy_multiplication_x: "✖️", heavy_division_sign: "➗",
  white_circle: "⚪", black_circle: "⚫",
  red_circle: "🔴", orange_circle: "🟠", yellow_circle: "🟡",
  green_circle: "🟢", blue_circle: "🔵", purple_circle: "🟣",
  red_square: "🟥", orange_square: "🟧", yellow_square: "🟨",
  green_square: "🟩", blue_square: "🟦", purple_square: "🟪",
};

let configured = false;

/**
 * Configure the singleton `marked` instance with highlight.js + emoji.
 * Safe to call multiple times — only applies once.
 */
export function configureMarked() {
  if (configured) return marked;
  configured = true;

  marked.use(
    markedHighlight({
      langPrefix: "hljs language-",
      highlight(code, lang) {
        const language = hljs.getLanguage(lang) ? lang : "plaintext";
        return hljs.highlight(code, { language }).value;
      },
    })
  );

  marked.use(
    markedEmoji({
      emojis,
      renderer: (token) => token.emoji,
    })
  );

  return marked;
}
