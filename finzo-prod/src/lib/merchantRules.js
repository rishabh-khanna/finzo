/**
 * Finzo — Merchant Categorization Rules
 * Rule-based engine — zero API calls for common merchants
 * Covers 95% of Indian consumer transactions
 */

// ── KEYWORD → CATEGORY RULES ─────────────────────────────────
// Ordered by priority (first match wins)
export const RULES = [
  // ── INCOME ──────────────────────────────────────────────────
  { pattern: /salary|sal cr|payroll|wages|stipend/i,               cat: 'income' },
  { pattern: /credit interest|interest cr|fd interest|rd maturity/i,cat: 'income' },
  { pattern: /refund|cashback|reversal|chargeback/i,               cat: 'income' },
  { pattern: /dividend|bonus credit/i,                             cat: 'income' },

  // ── EMI / LOANS ──────────────────────────────────────────────
  { pattern: /\bemi\b|loan repay|loan emi|hdfc loan|sbi loan|icici loan|bajaj fin|fullerton|capital first|home loan|car loan|personal loan/i, cat: 'emi' },

  // ── FOOD & DINING ────────────────────────────────────────────
  { pattern: /swiggy|zomato|dunzo food|box8|freshmenu|faasos|behrouz|oven story|rebel foods/i, cat: 'food' },
  { pattern: /mcdonald|mcdonalds|kfc|domino|pizza hut|burger king|subway|starbucks|cafe coffee|barista|chaayos|third wave|blue tokai/i, cat: 'food' },
  { pattern: /restaurant|dhaba|biryani|canteen|tiffin|lunch|dinner|breakfast|bakery|sweet shop|mithai/i, cat: 'food' },
  { pattern: /uber eats|food panda|magic pin food/i, cat: 'food' },

  // ── GROCERIES ────────────────────────────────────────────────
  { pattern: /dmart|d-mart|big bazaar|more retail|spencer|nature basket|lulu hypermarket|star bazaar|v-mart/i, cat: 'groceries' },
  { pattern: /big basket|bigbasket|grofers|blinkit|zepto|swiggy instamart|dunzo daily|jiomart|milkbasket/i, cat: 'groceries' },
  { pattern: /reliance fresh|reliance smart|heritage fresh|easyday/i, cat: 'groceries' },
  { pattern: /kirana|grocery|supermarket|hypermarket/i, cat: 'groceries' },

  // ── TRANSPORT ────────────────────────────────────────────────
  { pattern: /uber(?! eats)|ola cabs|ola(?! money)|rapido|meru|taxi|auto rickshaw/i, cat: 'transport' },
  { pattern: /metro rail|dmrc|bmrcl|nmrc|cmrl|hmrl|namma metro|bangalore metro/i, cat: 'transport' },
  { pattern: /irctc|indian rail|train ticket|railway ticket/i, cat: 'transport' },
  { pattern: /redbus|abhibus|bus ticket|volvo bus/i, cat: 'transport' },
  { pattern: /fastag|toll|plaza|highway/i, cat: 'transport' },
  { pattern: /petrol|diesel|fuel|hp petrol|indian oil|bharat petrol|iocl|bpcl|hpcl/i, cat: 'transport' },

  // ── TRAVEL ───────────────────────────────────────────────────
  { pattern: /air india|indigo|spicejet|vistara|akasa|go first|blue dart air|flight|airline/i, cat: 'travel' },
  { pattern: /makemytrip|mmt|goibibo|cleartrip|yatra|easemytrip|ixigo|oyo|treebo|fabhotel/i, cat: 'travel' },
  { pattern: /hotel|resort|inn|lodge|hostel|airbnb/i, cat: 'travel' },

  // ── SHOPPING ─────────────────────────────────────────────────
  { pattern: /amazon(?! pay bill| recharge)|flipkart|myntra|ajio|nykaa|meesho|snapdeal|shopsy|tatacliq|croma|vijay sales|reliance digital/i, cat: 'shopping' },
  { pattern: /lifestyle|shoppers stop|central|pantaloons|max fashion|westside|zara|h&m|marks spencer/i, cat: 'shopping' },
  { pattern: /decathlon|sports|nike|adidas|puma|reebok/i, cat: 'shopping' },
  { pattern: /ikea|hometown|pepperfry|urban ladder|fabindia/i, cat: 'shopping' },

  // ── SUBSCRIPTIONS ────────────────────────────────────────────
  { pattern: /netflix|amazon prime|hotstar|disney\+|sony liv|zee5|voot|mxplayer|jio cinema|sun nxt/i, cat: 'subscriptions' },
  { pattern: /spotify|gaana|jiosaavn|wynk|apple music|youtube premium|youtube music/i, cat: 'subscriptions' },
  { pattern: /microsoft 365|office 365|adobe|autodesk|canva|figma|notion|slack|zoom/i, cat: 'subscriptions' },
  { pattern: /linkedin premium|coursera|udemy|byju|unacademy|vedantu|upgrad/i, cat: 'subscriptions' },
  { pattern: /icloud storage|google one|dropbox|onedrive/i, cat: 'subscriptions' },

  // ── UTILITIES ────────────────────────────────────────────────
  { pattern: /tata power|adani electricity|best electric|msedcl|bescom|tneb|cesc|reliance energy|torrent power/i, cat: 'utilities' },
  { pattern: /airtel(?! thanks| recharge)|vodafone|vi mobile|jio(?!mart| cinema| saavn)|bsnl|idea/i, cat: 'utilities' },
  { pattern: /electricity|water bill|gas bill|igl gas|mahanagar gas|gujarat gas|piped gas/i, cat: 'utilities' },
  { pattern: /broadband|internet bill|act fibernet|you broadband|hathway|tikona/i, cat: 'utilities' },

  // ── HEALTH ───────────────────────────────────────────────────
  { pattern: /apollo pharmacy|medplus|netmeds|1mg|pharmeasy|healthkart|wellness forever/i, cat: 'health' },
  { pattern: /hospital|clinic|doctor|consultation|diagnostic|pathlab|lab test|health check/i, cat: 'health' },
  { pattern: /practo|lybrate|doc prime|mfine|tata health|bajaj health/i, cat: 'health' },
  { pattern: /gym|fitness|cult fit|gold's gym|anytime fitness|yoga|meditation/i, cat: 'health' },
  { pattern: /insurance premium|health insurance|star health|care health|niva bupa/i, cat: 'health' },

  // ── ENTERTAINMENT ────────────────────────────────────────────
  { pattern: /inox|pvr|cinepolis|carnival cinema|movie ticket|bookmyshow/i, cat: 'entertainment' },
  { pattern: /game|steam|playstation|xbox|nintendo|in-app purchase/i, cat: 'entertainment' },
  { pattern: /concert|event|show|exhibition|amusement|theme park|wonderla/i, cat: 'entertainment' },

  // ── EDUCATION ────────────────────────────────────────────────
  { pattern: /school fee|college fee|tuition|coaching|edu|university|institute fee/i, cat: 'education' },

  // ── INVESTMENTS ──────────────────────────────────────────────
  { pattern: /mutual fund|mf purchase|sip|groww|zerodha|upstox|paytm money|angel broking|icicidirect|hdfc sec|motilal oswal/i, cat: 'investments' },
  { pattern: /fd creation|fixed deposit|recurring deposit|rd opening|ppf|nps|elss/i, cat: 'investments' },
  { pattern: /coin purchase|gold purchase|sovereign gold|digital gold|mmtc-pamp/i, cat: 'investments' },

  // ── TRANSFERS ────────────────────────────────────────────────
  { pattern: /neft|rtgs|imps|upi.*transfer|transfer to|sent to|paid to/i, cat: 'transfer' },

  // ── FEES & CHARGES ───────────────────────────────────────────
  { pattern: /bank charge|annual fee|late fee|gst charge|processing fee|convenience fee/i, cat: 'fees' },
  { pattern: /atm charge|cash withdrawal|atm withdrawal/i, cat: 'fees' },
]

// ── MAIN CATEGORIZER ─────────────────────────────────────────
/**
 * Categorize a transaction based on description + merchant name
 * Returns category string
 */
export function categorize(description = '', merchant = '') {
  const text = `${description} ${merchant}`.trim()

  for (const rule of RULES) {
    if (rule.pattern.test(text)) {
      return rule.cat
    }
  }

  return 'other'
}

// ── MERCHANT NAME CLEANER ─────────────────────────────────────
/**
 * Cleans up raw bank transaction description into a readable merchant name
 * Input:  "POS 4421*SWIGGY*MH/DEBIT"
 * Output: "Swiggy"
 */
export function cleanMerchant(raw = '') {
  if (!raw) return 'Unknown'

  // Remove common bank prefixes/suffixes
  let s = raw
    .replace(/^(UPI\/|UPI-|IMPS\/|NEFT\/|POS\/|POS\s+\d+\*?|NFS\/|BIL\/|INT\/|EMI\/|ACH\/|ECS\/|SI\//i, '')
    .replace(/\/[A-Z]{2,}$/i, '')    // remove state code suffix
    .replace(/\*\d{4,}$/i, '')       // remove trailing numbers
    .replace(/\s{2,}/g, ' ')
    .trim()

  // Known merchant mappings
  const MAP = {
    'SWIGGY':           'Swiggy',
    'ZOMATO':           'Zomato',
    'UBER':             'Uber',
    'OLA':              'Ola Cabs',
    'NETFLIX':          'Netflix',
    'HOTSTAR':          'Hotstar',
    'SPOTIFY':          'Spotify',
    'AMAZON PAY':       'Amazon Pay',
    'AMAZON':           'Amazon',
    'FLIPKART':         'Flipkart',
    'DMART':            'DMart',
    'BIGBASKET':        'Big Basket',
    'BIG BASKET':       'Big Basket',
    'BLINKIT':          'Blinkit',
    'ZEPTO':            'Zepto',
    'AIRTEL':           'Airtel',
    'JIO':              'Reliance Jio',
    'TATA POWER':       'Tata Power',
    'APOLLO':           'Apollo Pharmacy',
    'MEDPLUS':          'MedPlus',
    '1MG':              '1mg',
    'INOX':             'INOX Cinemas',
    'PVR':              'PVR Cinemas',
    'IRCTC':            'IRCTC',
    'AIR INDIA':        'Air India',
    'INDIGO':           'IndiGo',
    'MAKEMYTRIP':       'MakeMyTrip',
    'YOUTUBE':          'YouTube',
    'GOOGLE':           'Google',
    'GROWW':            'Groww',
    'ZERODHA':          'Zerodha',
    'HDFC BANK':        'HDFC Bank',
  }

  const upper = s.toUpperCase()
  for (const [key, val] of Object.entries(MAP)) {
    if (upper.includes(key)) return val
  }

  // Title-case the result
  return s
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
    .slice(0, 40)
}

// ── UPI ID → MERCHANT ────────────────────────────────────────
export function merchantFromUPI(upiId = '') {
  if (!upiId) return null
  const handle = upiId.split('@')[0].toLowerCase()
  const UPI_MAP = {
    'swiggy':      'Swiggy',
    'zomato':      'Zomato',
    'uber':        'Uber',
    'ola':         'Ola Cabs',
    'netflix':     'Netflix',
    'amazon':      'Amazon Pay',
    'flipkart':    'Flipkart',
    'dmart':       'DMart',
    'bigbasket':   'Big Basket',
    'blinkit':     'Blinkit',
    'zepto':       'Zepto',
    'jio':         'Reliance Jio',
    'airtel':      'Airtel',
    'tatapower':   'Tata Power',
    'apollo':      'Apollo Pharmacy',
    'inox':        'INOX Cinemas',
    'pvr':         'PVR Cinemas',
    'irctc':       'IRCTC',
    'groww':       'Groww',
  }
  return UPI_MAP[handle] || null
}
