// ============================================================
//  May I Present — Questionnaire Definition
// ============================================================

window.QUESTIONS = [

  // ── SECTION 1: THE OCCASION ──────────────────────────────
  {
    id: 'q_occasion',
    section: 'The Occasion',
    sectionNum: 1,
    totalSections: 6,
    question: "What are we celebrating? 🎉",
    subtitle: "Every perfect gift begins with a special moment.",
    type: 'single_choice',
    field: 'occasion',
    options: [
      { value: 'birthday',         label: '🎂 Birthday' },
      { value: 'wedding',          label: '💍 Wedding or Engagement' },
      { value: 'sweet16',          label: '🎉 Sweet 16 / Quinceañera' },
      { value: 'anniversary',      label: '💑 Anniversary' },
      { value: 'baby_shower',      label: '👶 Baby Shower / New Baby' },
      { value: 'graduation',       label: '🎓 Graduation' },
      { value: 'holiday',          label: '🎄 Holiday / Christmas' },
      { value: 'valentines',       label: '💝 Valentine\'s Day' },
      { value: 'mothers_fathers',  label: '💐 Mother\'s or Father\'s Day' },
      { value: 'housewarming',     label: '🏠 Housewarming' },
      { value: 'retirement',       label: '🌴 Retirement' },
      { value: 'just_because',     label: '✨ Just Because' },
      { value: 'other',            label: '🎊 Other' },
    ],
    next: (a) => {
      if (a.occasion === 'birthday')    return 'q_birthday_milestone';
      if (a.occasion === 'anniversary') return 'q_anniversary_years';
      if (a.occasion === 'baby_shower') return 'q_baby_type';
      if (a.occasion === 'graduation')  return 'q_grad_type';
      if (a.occasion === 'wedding')     return 'q_wedding_type';
      return 'q_recipient_relation';
    }
  },

  {
    id: 'q_birthday_milestone',
    section: 'The Occasion',
    sectionNum: 1,
    totalSections: 6,
    question: "Is this a milestone birthday?",
    subtitle: "Some birthdays deserve something truly extraordinary.",
    type: 'single_choice',
    field: 'birthday_milestone',
    options: [
      { value: 'regular',  label: '🎂 Just a regular birthday' },
      { value: '13th',     label: '🌟 13th — officially a teen!' },
      { value: '16th',     label: '✨ Sweet 16' },
      { value: '18th',     label: '🎊 18th Birthday' },
      { value: '21st',     label: '🥂 21st Birthday' },
      { value: '30th',     label: '🌸 The Big 3-0' },
      { value: '40th',     label: '💎 The Fabulous 40' },
      { value: '50th',     label: '👑 50 & Fabulous' },
      { value: '60plus',   label: '🌟 60 and Glorious' },
    ],
    next: () => 'q_recipient_relation'
  },

  {
    id: 'q_anniversary_years',
    section: 'The Occasion',
    sectionNum: 1,
    totalSections: 6,
    question: "How many years are they celebrating?",
    subtitle: "Each milestone deserves its own kind of magic.",
    type: 'single_choice',
    field: 'anniversary_years',
    options: [
      { value: '1st',      label: '🌹 1st Anniversary (Paper)' },
      { value: '2_4',      label: '💕 2–4 Years' },
      { value: '5th',      label: '🌟 5th Anniversary (Wood)' },
      { value: '10th',     label: '💞 10th Anniversary (Tin/Aluminum)' },
      { value: '15th',     label: '💐 15th Anniversary (Crystal)' },
      { value: '20th',     label: '✨ 20th Anniversary (China)' },
      { value: '25th',     label: '🥈 25th — Silver!' },
      { value: '50th',     label: '🥇 50th — Golden!' },
      { value: 'other_yrs',label: '📅 Another milestone' },
    ],
    next: () => 'q_recipient_relation'
  },

  {
    id: 'q_wedding_type',
    section: 'The Occasion',
    sectionNum: 1,
    totalSections: 6,
    question: "Is this for the bride, groom, or the couple?",
    subtitle: "Wedding gifts can go in so many beautiful directions.",
    type: 'single_choice',
    field: 'wedding_for',
    options: [
      { value: 'bride',    label: '👰 For the bride' },
      { value: 'groom',    label: '🤵 For the groom' },
      { value: 'couple',   label: '💑 For the couple together' },
      { value: 'bridal_party', label: '💐 A bridal party / bridesmaids gift' },
    ],
    next: () => 'q_recipient_relation'
  },

  {
    id: 'q_baby_type',
    section: 'The Occasion',
    sectionNum: 1,
    totalSections: 6,
    question: "Is this for the baby, the parents, or everyone?",
    subtitle: "New babies bring so many gifting possibilities!",
    type: 'single_choice',
    field: 'baby_gift_for',
    options: [
      { value: 'baby',         label: '👶 Mostly for the new baby' },
      { value: 'mom',          label: '💛 For the new mom' },
      { value: 'dad',          label: '💙 For the new dad' },
      { value: 'parents',      label: '💑 For both parents' },
      { value: 'whole_family', label: '👨‍👩‍👶 A lovely family gift' },
    ],
    next: () => 'q_recipient_relation'
  },

  {
    id: 'q_grad_type',
    section: 'The Occasion',
    sectionNum: 1,
    totalSections: 6,
    question: "What are they graduating from?",
    subtitle: "A huge achievement — let's honor it properly!",
    type: 'single_choice',
    field: 'grad_type',
    options: [
      { value: 'high_school',   label: '🏫 High School' },
      { value: 'college',       label: '🎓 College / University' },
      { value: 'grad_school',   label: '📚 Graduate / Law / Medical School' },
      { value: 'trade_school',  label: '🔧 Trade or Vocational School' },
      { value: 'phd',           label: '🏛️ PhD / Doctorate' },
    ],
    next: () => 'q_recipient_relation'
  },

  // ── SECTION 2: ABOUT THE RECIPIENT ──────────────────────
  {
    id: 'q_recipient_relation',
    section: 'About Them',
    sectionNum: 2,
    totalSections: 6,
    question: "Who is this special person to you?",
    subtitle: "The relationship helps me find something that truly fits.",
    type: 'single_choice',
    field: 'recipient_relation',
    options: [
      { value: 'partner',       label: '💑 My partner or spouse' },
      { value: 'mom',           label: '💐 My mom' },
      { value: 'dad',           label: '👔 My dad' },
      { value: 'daughter',      label: '👧 My daughter' },
      { value: 'son',           label: '👦 My son' },
      { value: 'sister',        label: '👩 My sister' },
      { value: 'brother',       label: '👨 My brother' },
      { value: 'best_friend',   label: '⭐ My best friend' },
      { value: 'friend',        label: '😊 A good friend' },
      { value: 'grandparent',   label: '👴 A grandparent' },
      { value: 'grandchild',    label: '🧒 A grandchild' },
      { value: 'aunt_uncle',    label: '👨‍👩‍👧 Aunt or uncle' },
      { value: 'colleague',     label: '💼 A colleague or boss' },
      { value: 'teacher',       label: '🍎 A teacher or mentor' },
      { value: 'other_relation',label: '🤝 Someone else' },
    ],
    next: () => 'q_recipient_name'
  },

  {
    id: 'q_recipient_name',
    section: 'About Them',
    sectionNum: 2,
    totalSections: 6,
    question: "What's their first name?",
    subtitle: "I love keeping things personal. 💛",
    type: 'text_input',
    field: 'recipient_name',
    placeholder: "Their first name",
    next: () => 'q_recipient_gender'
  },

  {
    id: 'q_recipient_gender',
    section: 'About Them',
    sectionNum: 2,
    totalSections: 6,
    question: (a) => `How does ${a.recipient_name || 'this person'} identify?`,
    subtitle: "This helps me curate the most fitting options.",
    type: 'single_choice',
    field: 'recipient_gender',
    options: [
      { value: 'woman',       label: '👩 She / Her' },
      { value: 'man',         label: '👨 He / Him' },
      { value: 'nonbinary',   label: '🌈 They / Them' },
      { value: 'prefer_not',  label: '🤍 Prefer not to say' },
    ],
    next: () => 'q_recipient_age'
  },

  {
    id: 'q_recipient_age',
    section: 'About Them',
    sectionNum: 2,
    totalSections: 6,
    question: (a) => `How old is ${a.recipient_name || 'this person'}?`,
    subtitle: "Age can really shape what makes a gift feel special.",
    type: 'single_choice',
    field: 'recipient_age',
    options: [
      { value: 'under_13', label: '🧒 Under 13' },
      { value: '13_17',    label: '🎒 13–17' },
      { value: '18_25',    label: '🎉 18–25' },
      { value: '26_35',    label: '✨ 26–35' },
      { value: '36_50',    label: '🌿 36–50' },
      { value: '51_65',    label: '🌸 51–65' },
      { value: '65plus',   label: '👑 65+' },
    ],
    next: () => 'q_how_well_known'
  },

  {
    id: 'q_how_well_known',
    section: 'About Them',
    sectionNum: 2,
    totalSections: 6,
    question: (a) => `How well do you know ${a.recipient_name || 'this person'}?`,
    subtitle: "This shapes how personal vs. universal I'll go.",
    type: 'single_choice',
    field: 'how_well_known',
    options: [
      { value: 'very_well', label: '💛 Very well — I know everything about them' },
      { value: 'well',      label: '😊 Pretty well' },
      { value: 'somewhat',  label: '🤔 Somewhat — I know the basics' },
      { value: 'not_well',  label: '😅 Not that well — it\'s a tricky one!' },
    ],
    next: () => 'q_personality'
  },

  // ── SECTION 3: PERSONALITY & LIFESTYLE ──────────────────
  {
    id: 'q_personality',
    section: 'Their Personality',
    sectionNum: 3,
    totalSections: 6,
    question: (a) => `How would you describe ${a.recipient_name || 'this person'}?`,
    subtitle: "Select everything that resonates — the more you share, the better!",
    type: 'multi_choice',
    field: 'personality',
    options: [
      { value: 'creative',      label: '🎨 Creative & Artistic' },
      { value: 'intellectual',  label: '📚 Intellectual & Curious' },
      { value: 'active',        label: '🏃 Active & Athletic' },
      { value: 'foodie',        label: '🍳 Foodie & Home Cook' },
      { value: 'nature',        label: '🌿 Nature & Outdoors Lover' },
      { value: 'tech',          label: '💻 Tech-Savvy' },
      { value: 'music_lover',   label: '🎵 Music Lover' },
      { value: 'traveler',      label: '✈️ Traveler & Adventurer' },
      { value: 'wellness',      label: '🧘 Wellness & Self-Care Focused' },
      { value: 'fashionable',   label: '👗 Fashion & Style Conscious' },
      { value: 'homebody',      label: '🏠 Homebody & Cozy Vibes' },
      { value: 'gamer',         label: '🎮 Gamer' },
      { value: 'social',        label: '🌟 Social Butterfly' },
      { value: 'ambitious',     label: '💼 Career-Driven & Ambitious' },
      { value: 'funny',         label: '😄 Funny & Playful' },
      { value: 'sentimental',   label: '💕 Sentimental & Warm-Hearted' },
      { value: 'spiritual',     label: '🌙 Spiritual or Mindful' },
      { value: 'eco_conscious', label: '♻️ Eco-Conscious' },
    ],
    next: () => 'q_hobbies'
  },

  {
    id: 'q_hobbies',
    section: 'Their Personality',
    sectionNum: 3,
    totalSections: 6,
    question: (a) => `What are ${a.recipient_name || 'their'} main hobbies or interests?`,
    subtitle: "Pick as many as apply — there are no wrong answers here!",
    type: 'multi_choice',
    field: 'hobbies',
    options: [
      { value: 'cooking_baking',     label: '🍳 Cooking / Baking' },
      { value: 'fitness_sports',     label: '🏋️ Fitness / Sports' },
      { value: 'reading_writing',    label: '📖 Reading / Writing' },
      { value: 'music_concerts',     label: '🎸 Music / Live Concerts' },
      { value: 'art_crafts',         label: '🎨 Art / Crafts / DIY' },
      { value: 'travel',             label: '✈️ Travel & Exploring' },
      { value: 'gaming',             label: '🎮 Gaming' },
      { value: 'gardening',          label: '🌱 Gardening / Plants' },
      { value: 'film_tv',            label: '🎬 Movies / TV / Streaming' },
      { value: 'wine_cocktails',     label: '🍷 Wine / Cocktails / Coffee' },
      { value: 'beauty_skincare',    label: '💄 Beauty / Skincare' },
      { value: 'fashion',            label: '👗 Fashion / Shopping' },
      { value: 'yoga_meditation',    label: '🧘 Yoga / Meditation' },
      { value: 'pets',               label: '🐾 Pets & Animals' },
      { value: 'photography',        label: '📷 Photography' },
      { value: 'dance',              label: '💃 Dancing' },
      { value: 'collecting',         label: '🏺 Collecting (art, vinyl, antiques…)' },
      { value: 'outdoors',           label: '🏕️ Hiking / Camping / Outdoors' },
      { value: 'volunteering',       label: '🤝 Volunteering & Community' },
      { value: 'astrology_tarot',    label: '🔮 Astrology / Tarot / Mystical' },
    ],
    next: () => 'q_free_time'
  },

  {
    id: 'q_free_time',
    section: 'Their Personality',
    sectionNum: 3,
    totalSections: 6,
    question: (a) => `How does ${a.recipient_name || 'this person'} love to spend their free time?`,
    subtitle: "Pick the one that fits them best.",
    type: 'single_choice',
    field: 'free_time',
    options: [
      { value: 'home_relaxing',  label: '🛋️ Relaxing at home — they love their cozy space' },
      { value: 'socializing',    label: '🥂 Socializing with friends and family' },
      { value: 'exploring',      label: '🗺️ Exploring new places and experiences' },
      { value: 'hobbies',        label: '🎨 Deep in a hobby or creative project' },
      { value: 'outdoors',       label: '🌳 Outside — hiking, parks, fresh air' },
      { value: 'fitness',        label: '🏃 Working out or staying active' },
      { value: 'balanced',       label: '⚖️ A beautiful mix of everything' },
    ],
    next: () => 'q_aesthetic'
  },

  {
    id: 'q_aesthetic',
    section: 'Their Personality',
    sectionNum: 3,
    totalSections: 6,
    question: (a) => `What's ${a.recipient_name || 'their'} style or aesthetic?`,
    subtitle: "This helps me find something that feels authentically like them.",
    type: 'multi_choice',
    field: 'aesthetic',
    options: [
      { value: 'classic',    label: '🕰️ Classic & Timeless' },
      { value: 'modern',     label: '🏙️ Modern & Minimalist' },
      { value: 'bohemian',   label: '🌸 Bohemian & Eclectic' },
      { value: 'rustic',     label: '🪵 Rustic & Cozy' },
      { value: 'glam',       label: '✨ Glam & Luxurious' },
      { value: 'sporty',     label: '👟 Sporty & Casual' },
      { value: 'quirky',     label: '🦋 Quirky & Unique' },
      { value: 'preppy',     label: '🎀 Preppy & Polished' },
      { value: 'outdoorsy',  label: '🏕️ Rugged & Outdoorsy' },
      { value: 'romantic',   label: '🌹 Romantic & Feminine' },
    ],
    next: () => 'q_sentimental_vs_practical'
  },

  // ── SECTION 4: GIFT PREFERENCES ─────────────────────────
  {
    id: 'q_sentimental_vs_practical',
    section: 'Gift Preferences',
    sectionNum: 4,
    totalSections: 6,
    question: (a) => `Does ${a.recipient_name || 'this person'} prefer sentimental or practical gifts?`,
    subtitle: "There's no wrong answer — just what fits them best!",
    type: 'single_choice',
    field: 'sentimental_vs_practical',
    options: [
      { value: 'sentimental', label: '💕 Sentimental — meaningful, emotional, personal' },
      { value: 'practical',   label: '🔧 Practical — something they\'ll actually use every day' },
      { value: 'both',        label: '✨ A beautiful mix of both' },
      { value: 'unsure',      label: '🤷 I\'m not sure — surprise us!' },
    ],
    next: () => 'q_experience_vs_physical'
  },

  {
    id: 'q_experience_vs_physical',
    section: 'Gift Preferences',
    sectionNum: 4,
    totalSections: 6,
    question: (a) => `Would ${a.recipient_name || 'they'} prefer an experience or a physical gift?`,
    subtitle: "Both are wonderful — it really depends on the person.",
    type: 'single_choice',
    field: 'experience_vs_physical',
    options: [
      { value: 'physical',    label: '🎁 A physical gift — something to unwrap and keep' },
      { value: 'experience',  label: '🎭 An experience — spa, class, event, dinner' },
      { value: 'both',        label: '💫 Either sounds wonderful!' },
      { value: 'unsure',      label: '🤔 I\'m honestly not sure' },
    ],
    next: () => 'q_price_sensitivity'
  },

  {
    id: 'q_price_sensitivity',
    section: 'Gift Preferences',
    sectionNum: 4,
    totalSections: 6,
    question: (a) => `How does ${a.recipient_name || 'this person'} feel about luxury vs. thoughtful simplicity?`,
    subtitle: "This helps me match the gift to who they are.",
    type: 'single_choice',
    field: 'price_sensitivity',
    options: [
      { value: 'loves_luxury',    label: '💎 They love luxury — they appreciate the finer things' },
      { value: 'appreciates_both',label: '⚖️ They appreciate both — it\'s really about the thought' },
      { value: 'thoughtful_wins', label: '💛 A thoughtful, simple gift means more than a pricey one' },
      { value: 'not_sure',        label: '🤷 I\'m not sure' },
    ],
    next: () => 'q_past_gifts'
  },

  {
    id: 'q_past_gifts',
    section: 'Gift Preferences',
    sectionNum: 4,
    totalSections: 6,
    question: (a) => `Have you given ${a.recipient_name || 'this person'} gifts before? What worked or didn't?`,
    subtitle: "Every hit and miss is a clue — nothing is too small to share!",
    type: 'text_area',
    field: 'past_gifts',
    placeholder: "e.g., 'They loved the personalized necklace I gave last year, but the candle set went unused…'",
    optional: true,
    next: () => 'q_wish_list'
  },

  {
    id: 'q_wish_list',
    section: 'Gift Preferences',
    sectionNum: 4,
    totalSections: 6,
    question: (a) => `Has ${a.recipient_name || 'this person'} mentioned anything they want or need recently?`,
    subtitle: "Sometimes the best gifts are the ones they hinted at!",
    type: 'text_area',
    field: 'wish_list',
    placeholder: "e.g., 'They keep saying they need a good coffee maker' or 'They mentioned wanting to try a pottery class'",
    optional: true,
    next: () => 'q_restrictions'
  },

  {
    id: 'q_restrictions',
    section: 'Gift Preferences',
    sectionNum: 4,
    totalSections: 6,
    question: "Any restrictions or things to absolutely avoid?",
    subtitle: "Better safe than sorry — I want this to be perfect!",
    type: 'multi_choice',
    field: 'restrictions',
    optional: true,
    options: [
      { value: 'food_allergies',      label: '🚫 Food allergies' },
      { value: 'fragrance_sensitivity',label: '🌸 Fragrance sensitivity' },
      { value: 'religious',           label: '🙏 Religious considerations' },
      { value: 'vegan',               label: '🌱 Vegan / cruelty-free only' },
      { value: 'alcohol_free',        label: '🍹 No alcohol' },
      { value: 'minimalist',          label: '🏠 No clutter — they\'re a minimalist' },
      { value: 'avoid_clothes',       label: '👗 Avoid clothing (sizing is tricky)' },
      { value: 'eco_only',            label: '♻️ Must be eco-friendly / sustainable' },
      { value: 'none',                label: '✅ No restrictions!' },
    ],
    next: () => 'q_restrictions_details'
  },

  {
    id: 'q_restrictions_details',
    section: 'Gift Preferences',
    sectionNum: 4,
    totalSections: 6,
    question: "Any specific details about restrictions, preferences, or things to know?",
    subtitle: "Every detail helps me find exactly the right fit.",
    type: 'text_area',
    field: 'restrictions_details',
    placeholder: "e.g., 'She\'s allergic to tree nuts' or 'He\'s very into sustainable brands'",
    optional: true,
    next: () => 'q_budget'
  },

  // ── SECTION 5: BUDGET & LOGISTICS ────────────────────────
  {
    id: 'q_budget',
    section: 'Budget & Details',
    sectionNum: 5,
    totalSections: 6,
    question: "What's your budget for this gift?",
    subtitle: "I work magic at every price point! Drag to set your range. 💛",
    type: 'budget_slider',
    field: 'budget',
    next: () => 'q_deadline'
  },

  {
    id: 'q_deadline',
    section: 'Budget & Details',
    sectionNum: 5,
    totalSections: 6,
    question: "When do you need the gift by?",
    subtitle: "I'll make sure everything arrives with time to spare.",
    type: 'date_picker',
    field: 'deadline',
    next: () => 'q_gift_wrapping'
  },

  {
    id: 'q_gift_wrapping',
    section: 'Budget & Details',
    sectionNum: 5,
    totalSections: 6,
    question: "Would you like gift wrapping and a handwritten note included?",
    subtitle: "The little touches make all the difference.",
    type: 'single_choice',
    field: 'gift_wrapping',
    options: [
      { value: 'yes_both',      label: '🎀 Yes — beautiful wrapping AND a handwritten note' },
      { value: 'note_only',     label: '✉️ A handwritten note only, please' },
      { value: 'wrapping_only', label: '🎁 Just wrapping is fine' },
      { value: 'no',            label: '📦 No extras needed' },
    ],
    next: () => 'q_delivery_address'
  },

  {
    id: 'q_delivery_address',
    section: 'Budget & Details',
    sectionNum: 5,
    totalSections: 6,
    question: "Where should we deliver the gift?",
    subtitle: "US delivery only. All information is kept strictly private. 🔒",
    type: 'address_form',
    field: 'delivery_address',
    next: () => 'q_one_word'
  },

  // ── SECTION 6: FINAL TOUCHES ─────────────────────────────
  {
    id: 'q_one_word',
    section: 'The Final Touches',
    sectionNum: 6,
    totalSections: 6,
    question: (a) => `In one word, how would you describe ${a.recipient_name || 'this person'}?`,
    subtitle: "Sometimes one word captures everything.",
    type: 'text_input',
    field: 'one_word_description',
    placeholder: "e.g., radiant · driven · adventurous · nurturing · hilarious",
    next: () => 'q_dream_gift'
  },

  {
    id: 'q_dream_gift',
    section: 'The Final Touches',
    sectionNum: 6,
    totalSections: 6,
    question: (a) => `If ${a.recipient_name || 'this person'} could have anything for this occasion, what do you think they'd secretly wish for?`,
    subtitle: "Dream big here — this is where the magic happens!",
    type: 'text_area',
    field: 'dream_gift',
    placeholder: "No idea is too wild. Trust your gut!",
    optional: true,
    next: () => 'q_their_love_language'
  },

  {
    id: 'q_their_love_language',
    section: 'The Final Touches',
    sectionNum: 6,
    totalSections: 6,
    question: (a) => `What's ${a.recipient_name || 'this person'}\'s love language?`,
    subtitle: "This can guide the feeling behind the gift.",
    type: 'single_choice',
    field: 'love_language',
    options: [
      { value: 'words',    label: '💬 Words of Affirmation — they love meaningful messages' },
      { value: 'acts',     label: '🛠️ Acts of Service — they appreciate things done for them' },
      { value: 'gifts',    label: '🎁 Receiving Gifts — they genuinely love presents' },
      { value: 'time',     label: '⏰ Quality Time — they treasure shared experiences' },
      { value: 'touch',    label: '🤗 Physical Touch — comfort and warmth matter most' },
      { value: 'not_sure', label: '🤷 Not sure!' },
    ],
    next: () => 'q_additional_notes'
  },

  {
    id: 'q_additional_notes',
    section: 'The Final Touches',
    sectionNum: 6,
    totalSections: 6,
    question: "Anything else I should know?",
    subtitle: "Any detail — big or small — helps me find the perfect one. 🎁",
    type: 'text_area',
    field: 'additional_notes',
    placeholder: "Share any extra context, feelings, or details…",
    optional: true,
    next: () => null
  }
];
