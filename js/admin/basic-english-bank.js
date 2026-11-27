import { getSvgIcon } from '../svg-icons.js?v=20261114_01';

/**
 * Canonical 1st Basic English Questions Bank (100 Core + 2 Bonus Round).
 * Target Engine: Recognition Module (m2 / selection).
 * Note: Not yet imported to Supabase DB — serves as the authoritative Admin Question Bank panel.
 */
export const BASIC_ENGLISH_BANK_QUESTIONS = [
  // ── 1–3: LIVE DYNAMIC QUESTIONS (PINNED AT POSITIONS 1–3) ──
  {
    no: 1,
    topic: 'Live Dynamic',
    subTopic: 'Live Time',
    mode: 'LIVE_TIME',
    dynamicType: 'live_time',
    question: 'Look at the current WITA time (HH:MM). How do you express this time in English?',
    options: [
      'Auto-generated correct time expression',
      'Distractor 1 (past/to swap)',
      'Distractor 2 (±15 min shift)',
      'Distractor 3 (±1 hour shift)'
    ],
    answer: 'Dynamic (Evaluated per student WITA start time)',
    fixedOrder: false,
    isBonus: false
  },
  {
    no: 2,
    topic: 'Live Dynamic',
    subTopic: 'Live Day',
    mode: 'LIVE_DAY',
    dynamicType: 'live_day',
    question: 'Dynamic Day Question (Random target per student: today / yesterday / tomorrow / day before yesterday / day after tomorrow)',
    options: [
      'Auto-generated target day',
      'Adjacent day -1',
      'Adjacent day +1',
      'Adjacent day +2'
    ],
    answer: 'Dynamic (Evaluated per student WITA date)',
    fixedOrder: false,
    isBonus: false
  },
  {
    no: 3,
    topic: 'Live Dynamic',
    subTopic: 'Live Date',
    mode: 'LIVE_DATE',
    dynamicType: 'live_date',
    question: 'Dynamic Date Question (Random target per student: today / yesterday / tomorrow ordinal date)',
    options: [
      'Month + the + ordinal (e.g. November the twenty-eighth)',
      'Cardinal trap (e.g. November twenty-eight)',
      'Wrong ordinal suffix trap',
      'Adjacent date trap'
    ],
    answer: 'Dynamic (Evaluated per student WITA date)',
    fixedOrder: false,
    isBonus: false
  },

  // ── 4–103: 100 CEC / PUNIA MATARAM / LOMBOK QUESTIONS ──
  {"no":4,"topic":"Time & Numbers","subTopic":"Time","mode":"MCQ","question":"Morning class at CEC starts at 8:30 a.m. How do we say 8:30?","options":["half past eight","half to eight","quarter past eight","thirty to nine"],"answer":"half past eight"},
  {"no":5,"topic":"Time & Numbers","subTopic":"Time","mode":"MCQ","question":"Ashar prayer in Mataram today is at 3:15 p.m. Another way to say 3:15 is ...","options":["quarter to three","quarter past three","half past three","quarter to four"],"answer":"quarter past three"},
  {"no":6,"topic":"Time & Numbers","subTopic":"Time","mode":"MCQ","question":"Basic English class ends at 5:45 p.m., just before Maghrib. 5:45 is ...","options":["quarter past five","quarter to five","quarter to six","half past five"],"answer":"quarter to six"},
  {"no":7,"topic":"Time & Numbers","subTopic":"Time","mode":"MCQ","question":"Pak Mahyun opens the CEC gate at 6:00 a.m. We say he opens it ___ six o'clock.","options":["in","on","at","by"],"answer":"at"},
  {"no":8,"topic":"Time & Numbers","subTopic":"Time","mode":"MCQ","question":"Dzuhur prayer is around 12:15 p.m., and class starts 45 minutes later at ...","options":["1:00 p.m.","12:45 p.m.","1:15 p.m.","12:50 p.m."],"answer":"1:00 p.m."},
  {"no":9,"topic":"Time & Numbers","subTopic":"Numbers","mode":"MCQ","question":"Indonesia celebrates Independence Day on ...","options":["August seventeen","August the seventeenth","August seventy","the seventeen of August"],"answer":"August the seventeenth"},
  {"no":10,"topic":"Time & Numbers","subTopic":"Numbers","mode":"MCQ","question":"National Education Day in Indonesia is on May 2nd. How is \"2nd\" written in words?","options":["two","twoth","second","twice"],"answer":"second"},
  {"no":11,"topic":"Time & Numbers","subTopic":"Numbers","mode":"MCQ","question":"A new Honda Beat motorbike in Mataram costs Rp 18,500,000. How do you read 18,500,000?","options":["eighteen million five hundred thousand","eighteen thousand five hundred","eighty million five hundred thousand","eighteen millions five hundreds"],"answer":"eighteen million five hundred thousand"},
  {"no":12,"topic":"Time & Numbers","subTopic":"Numbers","mode":"MCQ","question":"Mrs. Candra sells nasi campur for Rp 15,000. If {MEMBER_1} pays with Rp 50,000, the change is ...","options":["twenty-five thousand","thirty-five thousand","thirty thousand","forty-five thousand"],"answer":"thirty-five thousand"},
  {"no":13,"topic":"Time & Numbers","subTopic":"Numbers","mode":"MCQ","question":"A scooter price is Rp 24,000,000. Which number is \"twenty-four million\"?","options":["2,400,000","24,000,000","240,000","240,000,000"],"answer":"24,000,000"},
  {"no":14,"topic":"Part of Speech","subTopic":"Odd One Out","mode":"MCQ","question":"Which word does NOT belong to the group?","options":["teacher","student","market","quickly"],"answer":"quickly"},
  {"no":15,"topic":"Part of Speech","subTopic":"Odd One Out","mode":"MCQ","question":"Which word does NOT belong to the group?","options":["speak","write","listen","classroom"],"answer":"classroom"},
  {"no":16,"topic":"Part of Speech","subTopic":"Odd One Out","mode":"MCQ","question":"Which word does NOT belong to the group?","options":["clean","fresh","spicy","cook"],"answer":"cook"},
  {"no":17,"topic":"Part of Speech","subTopic":"Odd One Out","mode":"MCQ","question":"Which word does NOT belong to the group?","options":["under","beside","between","study"],"answer":"study"},
  {"no":18,"topic":"Part of Speech","subTopic":"Odd One Out","mode":"MCQ","question":"Which word does NOT belong to the group?","options":["because","although","and","notebook"],"answer":"notebook"},
  {"no":19,"topic":"Part of Speech","subTopic":"Odd One Out","mode":"MCQ","question":"Which word does NOT belong to the group?","options":["slowly","carefully","clearly","motorbike"],"answer":"motorbike"},
  {"no":20,"topic":"Part of Speech","subTopic":"Identification","mode":"MCQ","question":"In \"Miss Elysa teaches Basic English clearly,\" what part of speech is \"teaches\"?","options":["Noun","Verb","Adjective","Adverb"],"answer":"Verb"},
  {"no":21,"topic":"Part of Speech","subTopic":"Identification","mode":"MCQ","question":"In \"Mrs. Candra cooks delicious food in Punia,\" what part of speech is \"delicious\"?","options":["Adjective","Verb","Adverb","Pronoun"],"answer":"Adjective"},
  {"no":22,"topic":"Part of Speech","subTopic":"Identification","mode":"MCQ","question":"In \"Pak Mahyun locks the gate carefully,\" what part of speech is \"carefully\"?","options":["Noun","Adjective","Adverb","Preposition"],"answer":"Adverb"},
  {"no":23,"topic":"Part of Speech","subTopic":"Identification","mode":"MCQ","question":"In \"{MEMBER_1} sits beside {MEMBER_2},\" what part of speech is \"beside\"?","options":["Preposition","Conjunction","Verb","Noun"],"answer":"Preposition"},
  {"no":24,"topic":"Nouns","subTopic":"Singular & Plural","mode":"MCQ","question":"There are twenty ___ in the Basic English classroom.","options":["chair","chairs","chaires","a chair"],"answer":"chairs"},
  {"no":25,"topic":"Nouns","subTopic":"Singular & Plural","mode":"MCQ","question":"Many ___ visit Senggigi Beach on Sunday.","options":["child","childs","children","childrens"],"answer":"children"},
  {"no":26,"topic":"Nouns","subTopic":"Singular & Plural","mode":"MCQ","question":"Mrs. Candra uses two sharp ___ to chop vegetables.","options":["knife","knifes","knives","knifeses"],"answer":"knives"},
  {"no":27,"topic":"Nouns","subTopic":"Singular & Plural","mode":"MCQ","question":"We saw three ___ near the rice field in Lombok.","options":["buffalo","buffalos","a buffalo","buffaloeses"],"answer":"buffalo"},
  {"no":28,"topic":"Nouns","subTopic":"Singular & Plural","mode":"MCQ","question":"Both ___ at CEC have whiteboards and projectors.","options":["class","classes","classs","a class"],"answer":"classes"},
  {"no":29,"topic":"Nouns","subTopic":"Uncountable","mode":"MCQ","question":"{MEMBER_1} needs ___ water after walking from Punia.","options":["many","a few","some","two"],"answer":"some"},
  {"no":30,"topic":"Nouns","subTopic":"Uncountable","mode":"MCQ","question":"How ___ rice would you like on your plate, {MEMBER_1}?","options":["many","much","few","several"],"answer":"much"},
  {"no":31,"topic":"Nouns","subTopic":"Uncountable","mode":"MCQ","question":"Miss Elysa gave us useful ___ about tomorrow's exam.","options":["informations","an information","information","many information"],"answer":"information"},
  {"no":32,"topic":"Nouns","subTopic":"Uncountable","mode":"MCQ","question":"How ___ motorbikes are parked in front of CEC?","options":["much","many","little","amount"],"answer":"many"},
  {"no":33,"topic":"Nouns","subTopic":"Uncountable","mode":"MCQ","question":"Pak Mahyun bought new ___ for the CEC garden.","options":["equipments","an equipment","equipment","many equipment"],"answer":"equipment"},
  {"no":34,"topic":"Pronouns","subTopic":"Subject & Object","mode":"MCQ","question":"{MEMBER_1} and ___ are going to Epicentrum Mall after class.","options":["me","I","my","mine"],"answer":"I"},
  {"no":35,"topic":"Pronouns","subTopic":"Subject & Object","mode":"MCQ","question":"Miss Elysa asked {MEMBER_1} and ___ to clean the whiteboard.","options":["I","me","my","mine"],"answer":"me"},
  {"no":36,"topic":"Pronouns","subTopic":"Subject & Object","mode":"MCQ","question":"Mrs. Candra is very friendly. Everyone likes ___.","options":["she","her","hers","herself"],"answer":"her"},
  {"no":37,"topic":"Pronouns","subTopic":"Subject & Object","mode":"MCQ","question":"Pak Mahyun greeted the students and gave ___ the keys.","options":["they","their","them","theirs"],"answer":"them"},
  {"no":38,"topic":"Pronouns","subTopic":"Possessive","mode":"MCQ","question":"Is this {MEMBER_1}'s helmet, or is it ___?","options":["you","your","yours","yourself"],"answer":"yours"},
  {"no":39,"topic":"Pronouns","subTopic":"Possessive","mode":"MCQ","question":"CEC has ___ own study room near the front gate.","options":["it's","its","it","their"],"answer":"its"},
  {"no":40,"topic":"Pronouns","subTopic":"Possessive","mode":"MCQ","question":"Our classroom is upstairs, and ___ is on the ground floor.","options":["they","them","their","theirs"],"answer":"theirs"},
  {"no":41,"topic":"Pronouns","subTopic":"Demonstrative","mode":"MCQ","question":"___ marker in my hand is almost out of ink.","options":["This","That","These","Those"],"answer":"This"},
  {"no":42,"topic":"Pronouns","subTopic":"Demonstrative","mode":"MCQ","question":"Look at ___ motorbikes parked across the street!","options":["this","that","these","those"],"answer":"those"},
  {"no":43,"topic":"Pronouns","subTopic":"Demonstrative","mode":"MCQ","question":"___ worksheets on my desk are for today's Vocab class.","options":["This","That","These","Those"],"answer":"These"},
  {"no":44,"topic":"Articles","subTopic":"a / an","mode":"MCQ","question":"{MEMBER_1} brought ___ umbrella because it looked cloudy in Mataram.","options":["a","an","the","no article"],"answer":"an"},
  {"no":45,"topic":"Articles","subTopic":"a / an","mode":"MCQ","question":"There is ___ whiteboard at the front of our classroom.","options":["a","an","the","no article"],"answer":"a"},
  {"no":46,"topic":"Articles","subTopic":"a / an","mode":"MCQ","question":"We have ___ one-hour break before Speaking class.","options":["a","an","the","no article"],"answer":"a"},
  {"no":47,"topic":"Articles","subTopic":"a / an","mode":"MCQ","question":"{MEMBER_1} wants to become ___ English tutor like Miss Elysa.","options":["a","an","the","no article"],"answer":"an"},
  {"no":48,"topic":"Articles","subTopic":"the / Zero","mode":"MCQ","question":"___ Islamic Center is a famous landmark in Mataram.","options":["A","An","The","No article"],"answer":"The"},
  {"no":49,"topic":"Articles","subTopic":"the / Zero","mode":"MCQ","question":"{MEMBER_1} usually goes to CEC by ___ motorbike.","options":["a","an","the","no article"],"answer":"no article"},
  {"no":50,"topic":"Articles","subTopic":"the / Zero","mode":"MCQ","question":"Please pass me ___ dictionary on Miss Elysa's table.","options":["a","an","the","no article"],"answer":"the"},
  {"no":51,"topic":"Articles","subTopic":"the / Zero","mode":"MCQ","question":"___ Mount Rinjani is the highest mountain in Lombok.","options":["A","An","The","No article"],"answer":"No article"},
  {"no":52,"topic":"Verbs","subTopic":"To Be & Aux","mode":"MCQ","question":"{MEMBER_1} and {MEMBER_2} ___ in the same Basic English batch.","options":["is","am","are","was"],"answer":"are"},
  {"no":53,"topic":"Verbs","subTopic":"To Be & Aux","mode":"MCQ","question":"___ Mrs. Candra open her warung on Sundays?","options":["Do","Does","Is","Are"],"answer":"Does"},
  {"no":54,"topic":"Verbs","subTopic":"To Be & Aux","mode":"MCQ","question":"Pak Mahyun ___ a big bunch of keys for all the rooms.","options":["have","has","having","are"],"answer":"has"},
  {"no":55,"topic":"Verbs","subTopic":"To Be & Aux","mode":"MCQ","question":"I ___ ready for the 100 Questions Exam today.","options":["is","are","am","be"],"answer":"am"},
  {"no":56,"topic":"Verbs","subTopic":"To Be & Aux","mode":"MCQ","question":"We ___ not have class on national holidays.","options":["does","do","is","are"],"answer":"do"},
  {"no":57,"topic":"Verbs","subTopic":"Agreement","mode":"MCQ","question":"Miss Elysa ___ to CEC from Mataram every morning.","options":["drive","drives","driving","drove"],"answer":"drives"},
  {"no":58,"topic":"Verbs","subTopic":"Agreement","mode":"MCQ","question":"Every student in this class ___ a personal PIN.","options":["have","has","having","are"],"answer":"has"},
  {"no":59,"topic":"Verbs","subTopic":"Agreement","mode":"MCQ","question":"{MEMBER_1} always ___ breakfast at Mrs. Candra's stall.","options":["eat","eats","eating","eaten"],"answer":"eats"},
  {"no":60,"topic":"Verbs","subTopic":"Agreement","mode":"MCQ","question":"The students ___ their vocabulary homework every night.","options":["review","reviews","reviewing","reviewed"],"answer":"review"},
  {"no":61,"topic":"Verbs","subTopic":"Irregular Verbs","mode":"MCQ","question":"Yesterday, {MEMBER_1} ___ a new notebook at the bookstore.","options":["buy","buyed","bought","buying"],"answer":"bought"},
  {"no":62,"topic":"Verbs","subTopic":"Irregular Verbs","mode":"MCQ","question":"Last weekend, our batch ___ to Senggigi Beach together.","options":["go","goed","went","gone"],"answer":"went"},
  {"no":63,"topic":"Verbs","subTopic":"Irregular Verbs","mode":"MCQ","question":"Which irregular verb sequence (V1–V2–V3) is CORRECT?","options":["speak – spoke – spoken","teach – teached – taught","write – writed – written","eat – eated – eaten"],"answer":"speak – spoke – spoken"},
  {"no":64,"topic":"Adjective Order","subTopic":"3 Adjectives","mode":"MCQ","question":"Which phrase follows the correct adjective order for a classroom item?","options":["a small round wooden clock","a round small wooden clock","a wooden small round clock","a small wooden round clock"],"answer":"a small round wooden clock"},
  {"no":65,"topic":"Adjective Order","subTopic":"3 Adjectives","mode":"MCQ","question":"Which phrase is correct for {MEMBER_1}'s bag?","options":["a black big canvas bag","a big black canvas bag","a canvas big black bag","a big canvas black bag"],"answer":"a big black canvas bag"},
  {"no":66,"topic":"Adjective Order","subTopic":"3 Adjectives","mode":"MCQ","question":"Which phrase is correct for a motorbike in Punia?","options":["a new red Japanese motorbike","a red new Japanese motorbike","a Japanese new red motorbike","a red Japanese new motorbike"],"answer":"a new red Japanese motorbike"},
  {"no":67,"topic":"Adjective Order","subTopic":"3 Adjectives","mode":"MCQ","question":"Which phrase is correct for Mrs. Candra's dish?","options":["a spicy hot Indonesian soup","a hot spicy Indonesian soup","an Indonesian hot spicy soup","a delicious hot Indonesian soup"],"answer":"a delicious hot Indonesian soup"},
  {"no":68,"topic":"Adjective Order","subTopic":"3 Adjectives","mode":"MCQ","question":"Which phrase is correct for a Lombok souvenir?","options":["a beautiful traditional Sasak cloth","a traditional beautiful Sasak cloth","a Sasak beautiful traditional cloth","a cloth beautiful traditional Sasak"],"answer":"a beautiful traditional Sasak cloth"},
  {"no":69,"topic":"Adjective Order","subTopic":"3 Adjectives","mode":"MCQ","question":"Which phrase is correct for a study table at CEC?","options":["a long brown wooden table","a brown long wooden table","a wooden long brown table","a long wooden brown table"],"answer":"a long brown wooden table"},
  {"no":70,"topic":"Adjective Order","subTopic":"3 Adjectives","mode":"MCQ","question":"Which phrase is correct for {MEMBER_1}'s bottle?","options":["a blue small plastic bottle","a small blue plastic bottle","a plastic small blue bottle","a small plastic blue bottle"],"answer":"a small blue plastic bottle"},
  {"no":71,"topic":"Adjective Order","subTopic":"3 Adjectives","mode":"MCQ","question":"Which phrase is correct for a helmet?","options":["an expensive white racing helmet","a white expensive racing helmet","a racing white expensive helmet","an expensive racing white helmet"],"answer":"an expensive white racing helmet"},
  {"no":72,"topic":"Adjective Order","subTopic":"3 Adjectives","mode":"MCQ","question":"Which phrase is correct for Taman Mayura?","options":["a peaceful old Balinese temple","an old peaceful Balinese temple","a Balinese old peaceful temple","a peaceful Balinese old temple"],"answer":"a peaceful old Balinese temple"},
  {"no":73,"topic":"Adjective Order","subTopic":"3 Adjectives","mode":"MCQ","question":"Which phrase is correct for a cup of coffee?","options":["a ceramic small white cup","a small white ceramic cup","a white small ceramic cup","a small ceramic white cup"],"answer":"a small white ceramic cup"},
  {"no":74,"topic":"Adjective Order","subTopic":"3 Adjectives","mode":"MCQ","question":"Which phrase is correct for Miss Elysa's scarf?","options":["a lovely long silk scarf","a long lovely silk scarf","a silk lovely long scarf","a lovely silk long scarf"],"answer":"a lovely long silk scarf"},
  {"no":75,"topic":"Adjective Order","subTopic":"3 Adjectives","mode":"MCQ","question":"Which phrase is correct for a gift box?","options":["a small beautiful paper box","a beautiful small paper box","a paper small beautiful box","a beautiful paper small box"],"answer":"a beautiful small paper box"},
  {"no":76,"topic":"Adverbs","subTopic":"Manner","mode":"MCQ","question":"Miss Elysa explains every grammar rule ___ so all students understand.","options":["clear","clearly","clarity","clearer"],"answer":"clearly"},
  {"no":77,"topic":"Adverbs","subTopic":"Manner","mode":"MCQ","question":"Please ride your motorbike ___ along Jalan Pendidikan.","options":["careful","carefully","careless","care"],"answer":"carefully"},
  {"no":78,"topic":"Adverbs","subTopic":"Manner","mode":"MCQ","question":"{MEMBER_1} answered the live questions very ___.","options":["good","well","best","better"],"answer":"well"},
  {"no":79,"topic":"Adverbs","subTopic":"Manner","mode":"MCQ","question":"The rain fell ___ over Mataram this afternoon.","options":["heavy","heavily","heavier","heaviest"],"answer":"heavily"},
  {"no":80,"topic":"Adverbs","subTopic":"Frequency & Time","mode":"MCQ","question":"Pak Mahyun ___ arrives early before the students come.","options":["always","yet","yesterday","tomorrow"],"answer":"always"},
  {"no":81,"topic":"Adverbs","subTopic":"Frequency & Time","mode":"MCQ","question":"Have you finished your Vocab task ___, {MEMBER_1}?","options":["already","yet","always","never"],"answer":"yet"},
  {"no":82,"topic":"Adverbs","subTopic":"Frequency & Time","mode":"MCQ","question":"{MEMBER_1} ___ misses Basic English class because it is fun.","options":["never","always","ever","already"],"answer":"never"},
  {"no":83,"topic":"Adverbs","subTopic":"Frequency & Time","mode":"MCQ","question":"We have ___ practiced the 3-adjective formula in class.","options":["yet","already","ever","soon"],"answer":"already"},
  {"no":84,"topic":"Prepositions","subTopic":"Place","mode":"MCQ","question":"CEC is located ___ Punia, Mataram.","options":["at","in","on","between"],"answer":"in"},
  {"no":85,"topic":"Prepositions","subTopic":"Place","mode":"MCQ","question":"Mrs. Candra's food stall is ___ the main road and the alley.","options":["among","between","through","above"],"answer":"between"},
  {"no":86,"topic":"Prepositions","subTopic":"Place","mode":"MCQ","question":"{MEMBER_1} put the dictionary ___ the table.","options":["on","at","through","between"],"answer":"on"},
  {"no":87,"topic":"Prepositions","subTopic":"Place","mode":"MCQ","question":"Pak Mahyun sits ___ the front gate to welcome students.","options":["in","on","at","above"],"answer":"at"},
  {"no":88,"topic":"Prepositions","subTopic":"Place","mode":"MCQ","question":"The students walked ___ the gate into the CEC yard.","options":["above","through","between","beneath"],"answer":"through"},
  {"no":89,"topic":"Prepositions","subTopic":"Time","mode":"MCQ","question":"We have a special ceremony ___ August 17th.","options":["in","on","at","since"],"answer":"on"},
  {"no":90,"topic":"Prepositions","subTopic":"Time","mode":"MCQ","question":"Maghrib prayer begins ___ sunset in Lombok.","options":["in","on","at","for"],"answer":"at"},
  {"no":91,"topic":"Prepositions","subTopic":"Time","mode":"MCQ","question":"{MEMBER_1} has studied at CEC ___ two weeks.","options":["since","for","at","on"],"answer":"for"},
  {"no":92,"topic":"Prepositions","subTopic":"Time","mode":"MCQ","question":"Miss Elysa has taught in Mataram ___ 2021.","options":["for","since","during","at"],"answer":"since"},
  {"no":93,"topic":"Prepositions","subTopic":"Time","mode":"MCQ","question":"Please submit your exam ___ 6:00 p.m. at the latest.","options":["until","by","since","in"],"answer":"by"},
  {"no":94,"topic":"Comparison Degree","subTopic":"Comparative","mode":"MCQ","question":"A Honda Vario (Rp 24M) is ___ than a Honda Beat (Rp 18.5M).","options":["expensive","more expensive","most expensive","expensiver"],"answer":"more expensive"},
  {"no":95,"topic":"Comparison Degree","subTopic":"Comparative","mode":"MCQ","question":"Punia is ___ to Mataram Mall than Senggigi Beach is.","options":["close","closer","closest","more close"],"answer":"closer"},
  {"no":96,"topic":"Comparison Degree","subTopic":"Comparative","mode":"MCQ","question":"Mrs. Candra's spicy sambal is ___ today than yesterday.","options":["hot","hotter","hottest","more hot"],"answer":"hotter"},
  {"no":97,"topic":"Comparison Degree","subTopic":"Comparative","mode":"MCQ","question":"Speaking English becomes ___ when we practice every day.","options":["easy","easier","easiest","more easy"],"answer":"easier"},
  {"no":98,"topic":"Comparison Degree","subTopic":"Comparative","mode":"MCQ","question":"Traffic near Epicentrum Mall on Saturday is ___ than on Tuesday.","options":["bad","worse","worst","more bad"],"answer":"worse"},
  {"no":99,"topic":"Comparison Degree","subTopic":"Superlative","mode":"MCQ","question":"Mount Rinjani is the ___ mountain in West Nusa Tenggara.","options":["high","higher","highest","most high"],"answer":"highest"},
  {"no":100,"topic":"Comparison Degree","subTopic":"Superlative","mode":"MCQ","question":"Mandalika is one of the ___ beaches in Lombok.","options":["beautiful","more beautiful","most beautiful","beautifulest"],"answer":"most beautiful"},
  {"no":101,"topic":"Comparison Degree","subTopic":"Superlative","mode":"MCQ","question":"Mrs. Candra makes the ___ nasi campur near CEC.","options":["good","better","best","most good"],"answer":"best"},
  {"no":102,"topic":"Comparison Degree","subTopic":"Superlative","mode":"MCQ","question":"For {MEMBER_1}, Basic English is the ___ class at CEC.","options":["interesting","more interesting","most interesting","interestinger"],"answer":"most interesting"},
  {"no":103,"topic":"Comparison Degree","subTopic":"Superlative","mode":"MCQ","question":"Subuh is the ___ prayer time of the day.","options":["early","earlier","earliest","more early"],"answer":"earliest"},

  // ── 101–102: BONUS ROUND (UNLOCKED AFTER ALL 100 CORE QUESTIONS ARE ANSWERED) ──
  {
    no: 101,
    topic: 'Bonus Round',
    subTopic: 'Surprise 1',
    mode: 'BONUS',
    dynamicType: 'bonus_round',
    question: 'Bahasa Inggris itu mudah dan menyenangkan, bukan?',
    options: ['Mudah', 'Menyenangkan', 'Mudah dan menyenangkan'],
    answer: 'Any option is correct (Excluded from score)',
    fixedOrder: true,
    isBonus: true
  },
  {
    no: 102,
    topic: 'Bonus Round',
    subTopic: 'Surprise 2',
    mode: 'BONUS',
    dynamicType: 'bonus_round',
    question: 'Who is the most handsome tutor in the world?',
    options: ['Mr. Top', 'Mr. Topan', 'Mr. Taufan Hadi'],
    answer: 'Any option is correct (Excluded from score)',
    fixedOrder: true,
    isBonus: true
  }
];

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const BANK_STORAGE_KEY = 'topscore_basic_english_bank_v4';

export function getBasicEnglishBankQuestions() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(BANK_STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}
  return BASIC_ENGLISH_BANK_QUESTIONS.map(q => ({ ...q, options: [...q.options] }));
}

export function saveBasicEnglishBankQuestions(list) {
  try {
    if (typeof localStorage !== 'undefined' && Array.isArray(list)) {
      localStorage.setItem(BANK_STORAGE_KEY, JSON.stringify(list));
    }
  } catch (_) {}
}

/**
 * Publishes or updates the Basic English Exam (Selection Module) directly into Supabase `tests`.
 */
export async function syncBasicEnglishExamToDb({
  classId,
  institutionId = null,
  programId = null,
  levelId = null,
  title = 'Camp 1st Basic English Exam - 100 Questions Exam',
  passScore = 60,
  durationMinutes = 55,
  perQuestionSeconds = 30,
  warmupPerQuestionSeconds = 60,
  bonusPerQuestionSeconds = 60,
  includeLive = true,
  includeBonus = true,
  topicQuotas = null,
  existingTests = []
} = {}) {
  if (!classId) throw new Error('Class ID is required to generate Exam.');

  const allBank = getBasicEnglishBankQuestions();
  const filtered = [];
  const topicCounters = {};

  for (const q of allBank) {
    if (['live_time', 'live_day', 'live_date'].includes(q.dynamicType)) {
      if (includeLive) filtered.push(q);
      continue;
    }
    if (q.isBonus) {
      if (includeBonus) filtered.push(q);
      continue;
    }
    if (topicQuotas && Object.prototype.hasOwnProperty.call(topicQuotas, q.topic)) {
      const limit = Math.max(0, Number(topicQuotas[q.topic] || 0));
      const used = topicCounters[q.topic] || 0;
      if (used >= limit) continue;
      topicCounters[q.topic] = used + 1;
    }
    filtered.push(q);
  }

  const payloadQuestions = filtered.map((q, idx) => ({
    question_id: null,
    question_text_snapshot: q.question,
    accepted_answers_snapshot: q.isBonus ? q.options : [q.answer],
    options_snapshot: [...q.options],
    topic_snapshot: q.topic,
    sub_topic_snapshot: q.subTopic,
    word_type_snapshot: q.subTopic || q.topic,
    answer_type: 'selection',
    dynamic_type: q.dynamicType || null,
    fixed_option_order: Boolean(q.fixedOrder || q.isBonus),
    is_bonus_round: Boolean(q.isBonus),
    display_order: idx + 1
  }));

  const coreCount = filtered.filter(q => !q.isBonus).length;
  const topicOnlyCount = filtered.filter(q => !q.isBonus && !['live_time', 'live_day', 'live_date'].includes(q.dynamicType)).length;
  const defaultShellCode = 'CAMP-1BSC-B-EXAM';
  const existing = (existingTests || []).find(t =>
    String(t.shell_code || '').toUpperCase() === defaultShellCode ||
    String(t.test_subtype || '').toUpperCase() === 'BASIC_ENGLISH_SELECTION_EXAM' ||
    String(t.title || '').trim().toLowerCase() === String(title || '').trim().toLowerCase()
  );

  const resolvedShellCode = existing?.shell_code || defaultShellCode;
  const payloadObj = {
    ...(existing?.payload || {}),
    questions: payloadQuestions,
    total_questions: coreCount,
    snapshot_question_count: coreCount,
    topic_questions_count: topicOnlyCount,
    include_bonus_round: Boolean(includeBonus),
    pin_live_questions: Boolean(includeLive),
    question_order: 'random',
    answer_type: 'selection',
    module_key: 'selection',
    shell_code: resolvedShellCode,
    tier: 'EXAM',
    minimum_required_score: Number(passScore || 60),
    working_duration_minutes: Number(durationMinutes || 55),
    per_question_seconds: Math.max(5, Number(perQuestionSeconds || 30)),
    warmup_per_question_seconds: Math.max(10, Number(warmupPerQuestionSeconds || 60)),
    bonus_per_question_seconds: Math.max(10, Number(bonusPerQuestionSeconds || 60)),
    is_dynamic_shell: false
  };

  const { adminInsert, adminUpdate, clearAdminCache } = await import('../api.js?v=20261125_v688');
  const recordData = {
    institution_id: institutionId || existing?.institution_id || null,
    program_id: programId || existing?.program_id || null,
    class_id: classId,
    level_id: levelId || existing?.level_id || null,
    title: String(title || 'Camp 1st Basic English Exam - 100 Questions Exam').trim(),
    description: `1st Basic English Exam (${topicOnlyCount} Topic Questions${includeLive ? ' + 3 Live' : ''}${includeBonus ? ' + 2 Bonus Round' : ''})`,
    test_type: 'exam',
    category: 'EXAM',
    test_subtype: 'BASIC_ENGLISH_SELECTION_EXAM',
    shell_code: resolvedShellCode,
    answer_type: 'selection',
    question_order: 'random',
    working_duration_minutes: Number(durationMinutes || 40),
    minimum_required_score: Number(passScore || 60),
    status: 'PUBLISHED',
    is_dynamic_shell: false,
    payload: payloadObj,
    updated_at: new Date().toISOString()
  };

  let saved;
  if (existing && existing.id) {
    saved = await adminUpdate('tests', existing.id, recordData);
  } else {
    recordData.created_by = 'Basic English Bank Generator';
    recordData.created_at = new Date().toISOString();
    saved = await adminInsert('tests', recordData);
  }
  clearAdminCache();
  return { saved, coreCount, topicOnlyCount, totalItems: payloadQuestions.length, updated: Boolean(existing?.id) };
}

export async function renderBasicEnglishQuestionBank(area, ctx = {}) {
  if (!area) return;

  let bankQuestions = getBasicEnglishBankQuestions();
  let selectedTopic = 'ALL';
  let searchQuery = '';

  const getTopics = () => [...new Set(bankQuestions.map(q => q.topic))];

  const getFiltered = () => {
    return bankQuestions.filter(q => {
      if (selectedTopic !== 'ALL' && q.topic !== selectedTopic) return false;
      if (searchQuery) {
        const hay = `${q.no} ${q.topic} ${q.subTopic} ${q.question} ${q.options.join(' ')} ${q.answer}`.toLowerCase();
        if (!hay.includes(searchQuery)) return false;
      }
      return true;
    });
  };

  const renderRows = (list) => {
    if (list.length === 0) {
      return `<tr><td colspan="8" style="text-align:center; padding:32px; color:var(--clr-text-3);">No matching questions found.</td></tr>`;
    }
    const letters = ['A', 'B', 'C', 'D'];
    return list.map(q => {
      const modeBadge = q.mode === 'BONUS'
        ? `<span style="color:#a855f7; font-weight:700; font-size:12px;">BONUS</span>`
        : (q.mode.startsWith('LIVE_')
          ? `<span style="color:#38bdf8; font-weight:700; font-size:12px;">${escapeHtml(q.mode)}</span>`
          : `<span style="color:#95ff00; font-weight:700; font-size:12px;">SELECTION</span>`);

      const optsHtml = q.options.map((opt, idx) => {
        const isCorrect = !q.isBonus && !q.dynamicType && opt === q.answer;
        return `<div style="font-size:12px; line-height:1.35; ${isCorrect ? 'color:#95ff00; font-weight:700;' : 'color:var(--clr-text-2);'}"><span style="color:var(--clr-text-3); font-weight:700; margin-right:4px;">${letters[idx] || idx + 1}.</span>${escapeHtml(opt)}</div>`;
      }).join('');

      const ansHtml = q.isBonus
        ? `<span style="color:#a855f7; font-weight:600; font-size:12px;">${escapeHtml(q.answer)}</span>`
        : (q.dynamicType
          ? `<span style="color:#38bdf8; font-weight:600; font-size:12px;">${escapeHtml(q.answer)}</span>`
          : `<span style="color:#95ff00; font-weight:700; font-size:12px;">${escapeHtml(q.answer)}</span>`);

      return `
        <tr>
          <td style="text-align:center; font-weight:700; color:var(--clr-text-2);">${q.no}</td>
          <td style="font-weight:600; color:var(--clr-text-1); white-space:nowrap;">${escapeHtml(q.topic)}</td>
          <td style="color:var(--clr-text-3); white-space:nowrap; font-size:12px;">${escapeHtml(q.subTopic)}</td>
          <td style="color:var(--clr-text-1); font-size:12px; line-height:1.4; min-width:250px;">${escapeHtml(q.question)}</td>
          <td style="min-width:240px;">${optsHtml}</td>
          <td style="min-width:170px;">${ansHtml}</td>
          <td style="text-align:center; white-space:nowrap;">${modeBadge}</td>
          <td style="text-align:center; white-space:nowrap;">
            <button type="button" class="btn btn-ghost btn-xs be-edit-q-btn" data-no="${q.no}" style="color:#38bdf8; font-size:12px; font-weight:600; padding:2px 8px;">${getSvgIcon('edit', 12)} Edit</button>
          </td>
        </tr>
      `;
    }).join('');
  };

  const openQuestionEditorModal = (existingQ = null) => {
    const isNew = !existingQ;
    const qObj = existingQ || {
      no: bankQuestions.length + 1,
      topic: 'Grammar Draft',
      subTopic: 'Custom',
      mode: 'MCQ',
      question: '',
      options: ['', '', '', ''],
      answer: ''
    };
    const modal = document.createElement('div');
    modal.id = 'be-q-editor-modal';
    modal.style.cssText = 'position:fixed; inset:0; z-index:9999; background:rgba(2,6,23,0.78); display:flex; align-items:center; justify-content:center; padding:10px;';
    modal.innerHTML = `
      <div style="width:100%; max-width:560px; background:#0f172a; border:1px solid rgba(56,189,248,0.35); border-radius:10px; padding:10px; display:flex; flex-direction:column; gap:10px; box-shadow:0 20px 50px rgba(0,0,0,0.6);">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:10px;">
          <h3 style="margin:0; font-size:15px; font-weight:800; color:#f8fafc;">${isNew ? 'Add Question Material' : `Edit Question #${qObj.no}`}</h3>
          <button type="button" id="be-q-close" class="btn btn-ghost btn-xs" style="color:#94a3b8;">✕</button>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div>
            <label style="font-size:12px; color:#94a3b8; font-weight:700;">Topic</label>
            <input id="be-q-topic" class="form-control" value="${escapeHtml(qObj.topic)}" style="height:30px; font-size:12px;" />
          </div>
          <div>
            <label style="font-size:12px; color:#94a3b8; font-weight:700;">Sub-Topic</label>
            <input id="be-q-subtopic" class="form-control" value="${escapeHtml(qObj.subTopic)}" style="height:30px; font-size:12px;" />
          </div>
        </div>
        <div>
          <label style="font-size:12px; color:#94a3b8; font-weight:700;">Question Text</label>
          <textarea id="be-q-text" class="form-control" rows="2" style="font-size:12px;">${escapeHtml(qObj.question)}</textarea>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div><label style="font-size:12px; color:#94a3b8;">Option 1 (Correct / Choice)</label><input id="be-q-opt0" class="form-control" value="${escapeHtml(qObj.options[0] || '')}" style="height:30px; font-size:12px;" /></div>
          <div><label style="font-size:12px; color:#94a3b8;">Option 2</label><input id="be-q-opt1" class="form-control" value="${escapeHtml(qObj.options[1] || '')}" style="height:30px; font-size:12px;" /></div>
          <div><label style="font-size:12px; color:#94a3b8;">Option 3</label><input id="be-q-opt2" class="form-control" value="${escapeHtml(qObj.options[2] || '')}" style="height:30px; font-size:12px;" /></div>
          <div><label style="font-size:12px; color:#94a3b8;">Option 4</label><input id="be-q-opt3" class="form-control" value="${escapeHtml(qObj.options[3] || '')}" style="height:30px; font-size:12px;" /></div>
        </div>
        <div>
          <label style="font-size:12px; color:#95ff00; font-weight:700;">Correct Answer (Exact Option Text)</label>
          <input id="be-q-answer" class="form-control" value="${escapeHtml(qObj.answer)}" style="height:30px; font-size:12px;" />
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:4px;">
          <button type="button" id="be-q-cancel" class="btn btn-ghost btn-sm">Cancel</button>
          <button type="button" id="be-q-save" class="btn btn-primary btn-sm">Save to Bank</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.querySelector('#be-q-close').onclick = close;
    modal.querySelector('#be-q-cancel').onclick = close;
    modal.querySelector('#be-q-save').onclick = () => {
      const opts = [0, 1, 2, 3].map(i => modal.querySelector(`#be-q-opt${i}`).value.trim()).filter(Boolean);
      const updated = {
        ...qObj,
        topic: modal.querySelector('#be-q-topic').value.trim() || 'General',
        subTopic: modal.querySelector('#be-q-subtopic').value.trim() || 'Custom',
        question: modal.querySelector('#be-q-text').value.trim(),
        options: opts,
        answer: modal.querySelector('#be-q-answer').value.trim() || opts[0] || ''
      };
      if (!updated.question || opts.length < 2) {
        if (window.showToast) window.showToast('Question text and at least 2 options are required.', 'error');
        return;
      }
      if (isNew) {
        bankQuestions.push(updated);
      } else {
        const idx = bankQuestions.findIndex(x => x.no === qObj.no);
        if (idx >= 0) bankQuestions[idx] = updated;
      }
      saveBasicEnglishBankQuestions(bankQuestions);
      close();
      renderBasicEnglishQuestionBank(area, ctx);
      if (window.showToast) window.showToast('Question saved to Basic English Bank.', 'success');
    };
  };

  const bindRowButtons = () => {
    area.querySelectorAll('.be-edit-q-btn').forEach(btn => {
      btn.onclick = () => {
        const no = Number(btn.getAttribute('data-no'));
        const target = bankQuestions.find(q => q.no === no);
        if (target) openQuestionEditorModal(target);
      };
    });
  };

  const syncSubPanel = (filteredCount) => {
    if (!window.setBottomInfobar) return;
    const topics = getTopics();
    const topicOpts = [`<option value="ALL"${selectedTopic === 'ALL' ? ' selected' : ''}>All Topics (${bankQuestions.length})</option>`]
      .concat(topics.map(t => {
        const count = bankQuestions.filter(q => q.topic === t).length;
        return `<option value="${escapeHtml(t)}"${selectedTopic === t ? ' selected' : ''}>${escapeHtml(t)} (${count})</option>`;
      }))
      .join('');

    const leftHtml = `
      <div style="display:inline-flex; align-items:center; gap:8px;">
        <select id="be-bank-topic-filter" class="form-control" style="height:28px; font-size:12px; padding:2px 8px; min-width:170px; background:rgba(15,23,42,0.85); border:1px solid rgba(255,255,255,0.14); color:#f8fafc;">
          ${topicOpts}
        </select>
        <input type="search" id="be-bank-search" value="${escapeHtml(searchQuery)}" placeholder="Search question or answer..." class="form-control" style="height:28px; font-size:12px; padding:2px 10px; width:190px; background:rgba(15,23,42,0.85); border:1px solid rgba(255,255,255,0.14); color:#f8fafc;" />
        <button type="button" id="be-bank-add-btn" class="btn btn-secondary btn-sm" style="height:28px; font-size:12px; padding:0 10px;">+ Add Material</button>
      </div>
    `;

    const rightHtml = `
      <div style="display:inline-flex; align-items:center; gap:10px; font-size:12px;">
        <span style="color:#94a3b8; font-weight:600;">Showing <strong id="be-bank-count" style="color:#f8fafc;">${filteredCount}</strong> / ${bankQuestions.length}</span>
        ${ctx.classId ? `<button type="button" id="be-bank-open-wizard-btn" class="btn btn-primary btn-sm" style="height:28px; font-size:12px; font-weight:700; padding:0 12px;">${getSvgIcon('zap', 13)} Test Generator</button>` : `<span style="color:#38bdf8; font-weight:700;">${getSvgIcon('check-circle', 13)} Selection Module Ready</span>`}
      </div>
    `;

    window.setBottomInfobar(leftHtml, rightHtml);

    const sel = document.getElementById('be-bank-topic-filter');
    const inp = document.getElementById('be-bank-search');
    const addBtn = document.getElementById('be-bank-add-btn');
    const wizBtn = document.getElementById('be-bank-open-wizard-btn');

    if (sel) sel.onchange = (e) => { selectedTopic = e.target.value; updateView(); };
    if (inp) inp.oninput = (e) => { searchQuery = String(e.target.value || '').trim().toLowerCase(); updateView(); };
    if (addBtn) addBtn.onclick = () => openQuestionEditorModal(null);
    if (wizBtn) wizBtn.onclick = () => openTestGeneratorWizard();
  };

  const openTestGeneratorWizard = () => {
    const coreTopics = ['Time & Numbers', 'Part of Speech', 'Articles', 'Verbs', 'Nouns', 'Pronouns', 'Adjective Order', 'Adverbs', 'Prepositions', 'Comparison Degree'];
    const topicItems = coreTopics.map(t => ({
      topic: t,
      avail: bankQuestions.filter(q => q.topic === t && !q.isBonus && !q.dynamicType).length
    }));
    const liveAvail = bankQuestions.filter(q => ['live_time', 'live_day', 'live_date'].includes(q.dynamicType)).length;
    const bonusAvail = bankQuestions.filter(q => q.isBonus).length;
    const initialTopicSum = topicItems.reduce((acc, x) => acc + x.avail, 0);

    const wiz = document.createElement('div');
    wiz.id = 'be-test-gen-wizard';
    wiz.style.cssText = 'position:fixed; inset:0; z-index:9999; background:rgba(2,6,23,0.82); display:flex; align-items:center; justify-content:center; padding:10px;';
    wiz.innerHTML = `
      <div style="width:100%; max-width:680px; background:#0f172a; border:1px solid rgba(56,189,248,0.4); border-radius:10px; padding:10px; display:flex; flex-direction:column; gap:10px; box-shadow:0 24px 60px rgba(0,0,0,0.65);">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:10px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="color:#38bdf8;">${getSvgIcon('zap', 18)}</span>
            <div>
              <h3 style="margin:0; font-size:15px; font-weight:800; color:#f8fafc;">Basic English Test Generator <span style="color:#38bdf8;">(Selection Module)</span></h3>
              <div style="font-size:12px; color:#94a3b8;">Set question count per topic (Live &amp; Bonus Round are NOT counted in the 100 topic questions)</div>
            </div>
          </div>
          <button type="button" id="be-wiz-close" class="btn btn-ghost btn-xs" style="color:#94a3b8;">✕</button>
        </div>

        <div style="display:grid; grid-template-columns:1fr 110px; gap:10px;">
          <div>
            <label style="font-size:12px; color:#94a3b8; font-weight:700;">Exam Title</label>
            <input id="be-wiz-title" class="form-control" value="Camp 1st Basic English Exam - 100 Questions Exam" style="height:32px; font-size:12px;" />
          </div>
          <div>
            <label style="font-size:12px; color:#94a3b8; font-weight:700;">Pass Score (%)</label>
            <input id="be-wiz-pass" type="number" min="0" max="100" value="60" class="form-control" style="height:32px; font-size:12px; text-align:center;" />
          </div>
        </div>

        <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(2,6,23,0.5); border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:10px;">
          <span style="font-size:12px; font-weight:700; color:#cbd5e1;">Topic Questions Distribution</span>
          <span id="be-wiz-topic-total" style="font-size:12px; font-weight:800; color:#95ff00;">Topic Total: ${initialTopicSum} Questions</span>
        </div>

        <div style="display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:10px;">
          ${topicItems.map(item => `
            <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; background:rgba(2,6,23,0.45); border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:10px;">
              <span style="font-size:12px; font-weight:600; color:#e2e8f0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${item.topic}">${item.topic}</span>
              <div style="display:inline-flex; align-items:center; gap:4px; flex-shrink:0;">
                <input type="number" class="be-wiz-quota form-control" data-topic="${item.topic}" min="0" max="${item.avail}" value="${item.avail}" style="width:48px; height:26px; font-size:12px; font-weight:700; text-align:center; padding:0 4px;" />
                <span style="font-size:12px; color:#64748b;">/${item.avail}</span>
              </div>
            </div>
          `).join('')}
        </div>

        <div style="display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:10px; background:rgba(2,6,23,0.45); border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:10px;">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
            <span style="font-size:12px; font-weight:700; color:#38bdf8;">Warm-Up (s/Q)</span>
            <input id="be-wiz-warmup-sec" type="number" min="10" max="300" value="60" class="form-control" style="width:56px; height:26px; font-size:12px; font-weight:700; text-align:center; padding:0 4px;" />
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
            <span style="font-size:12px; font-weight:700; color:#95ff00;">Core 100 (s/Q)</span>
            <input id="be-wiz-core-sec" type="number" min="5" max="180" value="30" class="form-control" style="width:56px; height:26px; font-size:12px; font-weight:700; text-align:center; padding:0 4px;" />
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
            <span style="font-size:12px; font-weight:700; color:#a855f7;">Bonus (s/Q)</span>
            <input id="be-wiz-bonus-sec" type="number" min="10" max="300" value="60" class="form-control" style="width:56px; height:26px; font-size:12px; font-weight:700; text-align:center; padding:0 4px;" />
          </div>
        </div>

        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; background:rgba(56,189,248,0.06); border:1px solid rgba(56,189,248,0.22); border-radius:6px; padding:10px;">
          <label style="display:inline-flex; align-items:center; gap:6px; font-size:12px; color:#38bdf8; font-weight:600; cursor:pointer; margin:0;">
            <input id="be-wiz-live" type="checkbox" checked style="accent-color:#38bdf8;" /> + ${liveAvail} Live Questions (Pinned 1–3, excluded from 100)
          </label>
          <label style="display:inline-flex; align-items:center; gap:6px; font-size:12px; color:#a855f7; font-weight:600; cursor:pointer; margin:0;">
            <input id="be-wiz-bonus" type="checkbox" checked style="accent-color:#a855f7;" /> + ${bonusAvail} Bonus Round (Excluded from 100 &amp; Score)
          </label>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:10px; border-top:1px solid rgba(255,255,255,0.08); padding-top:10px;">
          <button type="button" id="be-wiz-cancel" class="btn btn-ghost btn-sm">Cancel</button>
          <button type="button" id="be-wiz-generate" class="btn btn-primary btn-sm" style="font-weight:700;">${getSvgIcon('zap', 13)} Generate Exam</button>
        </div>
      </div>
    `;
    document.body.appendChild(wiz);

    const close = () => wiz.remove();
    wiz.querySelector('#be-wiz-close').onclick = close;
    wiz.querySelector('#be-wiz-cancel').onclick = close;

    const updateTotal = () => {
      let sum = 0;
      wiz.querySelectorAll('.be-wiz-quota').forEach(i => { sum += Math.max(0, Number(i.value || 0)); });
      const totalEl = wiz.querySelector('#be-wiz-topic-total');
      if (totalEl) totalEl.textContent = `Topic Total: ${sum} Questions`;
    };
    wiz.querySelectorAll('.be-wiz-quota').forEach(i => i.addEventListener('input', updateTotal));

    wiz.querySelector('#be-wiz-generate').onclick = async () => {
      const btn = wiz.querySelector('#be-wiz-generate');
      const titleVal = wiz.querySelector('#be-wiz-title').value.trim() || 'Basic English Final Exam';
      const passVal = Number(wiz.querySelector('#be-wiz-pass').value || 60);
      const includeLive = Boolean(wiz.querySelector('#be-wiz-live').checked);
      const includeBonus = Boolean(wiz.querySelector('#be-wiz-bonus').checked);
      const warmupSec = Math.max(10, Number(wiz.querySelector('#be-wiz-warmup-sec')?.value || 60));
      const coreSec = Math.max(5, Number(wiz.querySelector('#be-wiz-core-sec')?.value || 20));
      const bonusSec = Math.max(10, Number(wiz.querySelector('#be-wiz-bonus-sec')?.value || 60));
      const topicQuotas = {};
      let topicSum = 0;
      wiz.querySelectorAll('.be-wiz-quota').forEach(i => {
        const t = i.getAttribute('data-topic');
        const val = Math.max(0, Number(i.value || 0));
        if (t) { topicQuotas[t] = val; topicSum += val; }
      });
      const calcTotalMins = Math.max(5, Math.ceil(((includeLive ? liveAvail * warmupSec : 0) + (topicSum * coreSec) + (includeBonus ? bonusAvail * bonusSec : 0)) / 60));
      try {
        btn.disabled = true;
        btn.textContent = 'Generating...';
        const res = await syncBasicEnglishExamToDb({
          classId: ctx.classId,
          institutionId: ctx.institutionId,
          programId: ctx.programId,
          levelId: ctx.levelId,
          title: titleVal,
          passScore: passVal,
          durationMinutes: calcTotalMins,
          perQuestionSeconds: coreSec,
          warmupPerQuestionSeconds: warmupSec,
          bonusPerQuestionSeconds: bonusSec,
          includeLive,
          includeBonus,
          topicQuotas,
          existingTests: ctx.classTests || []
        });
        close();
        if (window.showToast) {
          window.showToast(`${res.updated ? 'Updated' : 'Generated'} "${titleVal}" (${res.coreCount} questions${includeBonus ? ' + Bonus Round' : ''})!`, 'success');
        }
        if (typeof ctx.onSynced === 'function') ctx.onSynced();
      } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Generate failed: ' + err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = `${getSvgIcon('zap', 13)} Generate Exam`;
      }
    };
  };

  const updateView = () => {
    const filtered = getFiltered();
    const tbody = document.getElementById('be-bank-tbody');
    if (tbody) tbody.innerHTML = renderRows(filtered);
    const countEl = document.getElementById('be-bank-count');
    if (countEl) countEl.textContent = filtered.length;
    bindRowButtons();
  };

  const initialList = getFiltered();
  area.innerHTML = `
    <div class="table-wrap" style="flex:1 1 0; min-height:0; overflow-y:auto;">
      <table class="data-table" id="basic-english-bank-table">
        <thead>
          <tr>
            <th style="width:52px; text-align:center;">NO</th>
            <th style="width:130px;">TOPIC</th>
            <th style="width:110px;">SUB-TOPIC</th>
            <th>QUESTION</th>
            <th>OPTIONS (A–D)</th>
            <th>ANSWER KEY</th>
            <th style="width:95px; text-align:center;">MODE</th>
            <th style="width:76px; text-align:center;">ACTION</th>
          </tr>
        </thead>
        <tbody id="be-bank-tbody">
          ${renderRows(initialList)}
        </tbody>
      </table>
    </div>
  `;

  bindRowButtons();
  syncSubPanel(initialList.length);
}
