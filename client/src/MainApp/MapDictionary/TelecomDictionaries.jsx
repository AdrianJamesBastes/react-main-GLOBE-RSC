// 1. THE DICTIONARIES
export const siteCodes = [
  "TCFGA", "TCPHT", "TCAIC", "TCEDC", "TCIS", "TCLDC", "TCAG", "TCLBS", 
  "NCCCM", "GAISC", "PSCMI", "GTFOC", "WMMCO", "GAI", "MINCO", "MSPAG"
];

export const regionsToProvincesMap = {
  // --- DAVAO REGION ---
  "Region XI": [
    "Davao del Norte", 
    "Davao del Sur", 
    "Davao Oriental", 
    "Davao de Oro", 
    "Compostela Valley",
    "Davao Occidental", 
    "Davao"
  ],
  
  // --- NORTHERN MINDANAO ---
  "Region X": [
    "Misamis Oriental", 
    "Misamis Occidental", 
    "Lanao del Norte", 
    "Bukidnon",
    "Camiguin"
  ],
  
  // --- SOCCSKSARGEN ---
  "Region XII": [
    "South Cotabato", 
    "North Cotabato", 
    "Cotabato",
    "Sultan Kudarat", 
    "Sarangani"
  ],
  
  // --- CARAGA REGION ---
  "Region XIII": [
    "Agusan del Norte", 
    "Agusan del Sur", 
    "Surigao del Norte", 
    "Surigao del Sur",
    "Dinagat Islands" 
  ],
  
  // --- ZAMBOANGA PENINSULA ---
  "Region IX": [
    "Zamboanga del Sur", 
    "Zamboanga del Norte",
    "Zamboanga Sibugay",
    "Zamboanga"          
  ],
  
  // --- BARMM ---
  "BARMM": [
    "Maguindanao",   
    "Lanao del Sur",
    "Basilan", 
    "Sulu", 
    "Tawi-Tawi"
  ]
};

export const provinces = {
  // Look how clean this is now! We removed DDN1 and DDN2.
  "DDN": "Davao del Norte", "DDS": "Davao del Sur", "DVO": "Davao Oriental", "DVOR": "Davao Oriental", 
  "DDO": "Davao de Oro", "CVLY": "Compostela Valley", "NCOT": "North Cotabato", 
  "SCOT": "South Cotabato", "MGDN": "Maguindanao", "LDN": "Lanao del Norte", 
  "LDS": "Lanao del Sur", "BUK": "Bukidnon", "ZDS": "Zamboanga del Sur", 
  "ZDN": "Zamboanga del Norte", "MISOR": "Misamis Oriental", "MOCC": "Misamis Occidental", 
  "SDN": "Surigao del Norte", "SDS": "Surigao del Sur", "AGS": "Agusan del Sur", 
  "AGN": "Agusan del Norte", "SAR": "Sarangani", "COT": "Cotabato",
  "BAS": "Basilan", "SULU": "Sulu", "TAWI": "Tawi-Tawi", "SKUD": "Sultan Kudarat",
  "CMGN": "Camiguin", "DNGT": "Dinagat Islands", "MOR": "Misamis Oriental", "NCO": "North Cotabato", "SCO": "South Cotabato",
  "DVOC": "Davao Occidental" 
};
 
export const cities = {
  "MKLALA": "Makilala", "PANABO": "Panabo City", "TAGUM": "Tagum City", "DIGOS": "Digos City", 
  "GENSAN": "General Santos City", "ZAMBOA": "Zamboanga City", "POLOMO": "Polomolok", 
  "MRAMAG": "Maramag", "KIDAP": "Kidapawan City", "COTAB": "Cotabato City", "MATI": "Mati City", 
  "GINGOO": "Gingoog City", "DIPOL": "Dipolog City", "OZAMIS": "Ozamiz City", "OZM": "Ozamiz City",
  "ILIGAN": "Iligan City", "MARAWI": "Marawi City", "BUTUAN": "Butuan City", "CARMEN": "Carmen", 
  "STOMAS": "Santo Tomas", "KPALON": "Kapalong", "SAMAL": "Island Garden City of Samal", 
  "PANTUK": "Pantukan", "MACO": "Maco", "MALITA": "Malita", "BANSAL": "Bansalan", 
  "PADADA": "Padada", "SULOP": "Sulop", "SMARIA": "Santa Maria", "GLAN": "Glan", 
  "ALABEL": "Alabel", "MALAPAT": "Malapatan", "SFRANC": "San Francisco", "MIDSAY": "Midsayap",
  "SFERN": "San Fernando", "PGDIAN": "Pagadian City", "MFORT": "Manolo Fortich", 
  "TACUROS": "Tacurong City", "BISLIG": "Bislig City", "CLAVER": "Claver", "BAYABS": "Bayabas", 
  "DAVAO": "Davao City", "CDO": "Cagayan de Oro", "AGUSAN": "Agusan", "AGUADA": "Aguada", "AFGA": "Afga",
  "MTALAM": "Matalam", "SANGKI": "Datu Abdullah Sangki", "SAUDIA": "Datu Saudi-Ampatuan", "SURGAO": "Surigao City",
  "MARAGU": "Maragusan", "NABUN": "Nabunturan", "MONTEV": "Montevista", "MAWAB": "Mawab", "MABINI": "Mabini",
  "COMPOS": "Compostela", "TACURO": "Tacurong City", "MIDSAY": "Midsayap", "MALAYB": "Malaybalay City", "JOLO": "JOLO",
  "BONGAO": "Bongao", "LUPON": "Lupon", "DPOLOG": "Dipolog City", "TANDAG": "Tandag City",
  "HINATU": "Hinatuan", "SARANG": "Sarangani", "SURIGAO": "Surigao City", "VALEN": "Valencia City", "MARBE": "Marbel City",
  // Removed the trailing comma here after Namnama
  "MONKAY": "Monkayo", "MLANG": "Mlang", "KABACAN": "Kabacan", "CONCEPC": "Concepcion", "ESPERAN": "Esperanza", "NAMNAM": "Namnama",
  "AGLAYA": "Aglayan", "BUENV": "Buenavista", "NASIPIT": "Nasipit", "SANTIAGO": "Santiago", "TANTANG": "Tantangan", "CABAD": "Cabadbaran City",
  "DUJAL": "Braulio E. Dujali", "TALAING": "Talaingod", "NEWCOR": "New Corella", "ASUNC": "Asuncion", "KALILA": "Kalilangan", "Sebu": "Lake Sebu",
  "TBOLI:": "T'boli", "TUPI": "Tupi"
};

export const cityToBarangayMap = {
  // --- DAVAO REGION (Region XI) ---
  "Davao City": [
    "Agdao", "Buhangin", "Calinan", "Marilog", "Paquibato", "Tugbok", "Toril", "Bajada", "Catalunan Grande", 
    "Catalunan Pequeño", "Communal", "Glan", "Marapangi", "Matina", "Poblacion", "Talomo", "Tibungco", "Baguio", 
    "Buhangin Proper", "Calinan Proper", "Marilog Proper", "Paquibato Proper", "Tugbok Proper", "Toril Proper", 
    "Bajada Proper", "Catalunan Grande Proper", "Catalunan Pequeño Proper", "Communal Proper", "Glan Proper", 
    "Marapangi Proper", "Matina Proper", "Poblacion Proper", "Talomo Proper", "Tibungco Proper", "Maa", "Panacan", 
    "Lasang", "Sasa", "Pampanga", "Lanang", "Obrero", "Mintal", "Bago Aplaya", "Bago Gallera", "Matina Aplaya", 
    "Matina Crossing", "Matina Pangi", "Ecoland", "Bucana", "Cabantian", "Indangan", "Mandug", "Langub", "Magtuod", "Davao City"
  ],
  "Panabo City": [
    "Gredu", "New Visayas", "San Vicente", "Southern Davao", "Sto. Nino", "Cagangohan", "J.P. Laurel", 
    "Datu Abdul Dadia", "San Francisco", "Nanyo", "Quezon", "Salvacion", "Manay", "San Pedro", "Tagpore", 
    "Mabunao", "Kasilak", "Cacao", "Consolacion", "Sindaton"
  ],
  "Tagum City": [
    "Apokon", "Visayan Village", "Magugpo East", "Magugpo North", "Magugpo South", "Magugpo West", "Magugpo Poblacion", 
    "Mankilam", "Cuambogan", "Canocotan", "La Filipina", "San Miguel", "Madaum", "Busaon", "Pagsabangan", "Pandapan", 
    "Bincungan", "Nueva Fuerza", "San Agustin"
  ],
  "Island Garden City of Samal": [
    "Babak", "Peñaplata", "Kaputian", "Villarica", "Mambago-A", "Mambago-B", "Tambo", "Cawag", "San Agustin", 
    "Kinawitnon", "Limao", "Miranda", "San Jose", "Poblacion", "Libuak", "Balet", "Anonang", "San Isidro"
  ],
  "Digos City": [
    "Aplaya", "Tres de Mayo", "Zone I", "Zone II", "Zone III", "San Jose", "Sinawilan", "Dawis", "Colorado", 
    "Kapatagan", "Matti", "San Miguel", "Cogon", "Igpit", "Ruparan", "Lungag", "Mahayahay"
  ],
  "Mati City": [
    "Central", "Dahican", "Matiao", "Sainz", "Badas", "Bobon", "Mayo", "Macambol", "Tamisan", "Buso", 
    "Don Enrique Lopez", "Don Martin Marundan", "Lawigan", "Dawan"
  ],

  // --- NORTHERN MINDANAO (Region X) ---
  "Cagayan de Oro": [
    "Carmen", "Lapasan", "Balulang", "Bugo", "Tablon", "Macasandig", "Kauswagan", "Lumbia", "Bulua", "Iponan", 
    "Agusan", "Puerto", "Gusa", "Cugman", "Camaman-an", "Nazareth", "Patag", "Bonbon", "Macabalan", "Puntod", 
    "Canitoan", "Pagatpat", "Dansolihon", "Mambuaya", "Tignapoloan"
  ],
  "Iligan City": [
    "Tubod", "Hinaplanon", "Suarez", "Mahayahay", "Tambacan", "Saray", "Tibanga", "Pala-o", "Poblacion", 
    "San Miguel", "Buru-un", "Del Carmen", "Ditucalan", "Luinab", "Pugaan", "Santa Filomena", "Santiago", "Tomas Cabili"
  ],
  "Malaybalay City": [
    "Aglayan", "Bangcud", "Casisang", "Kalasungay", "Kisolon", "Laguitas", "Linabo", "Sumpong", "San Jose", 
    "Poblacion", "Can-ayan", "Managok", "Mapayag", "Impalambong", "Aglayan", "Aglaya"
  ],
  "Valencia City": [
    "Poblacion", "Bagontaas", "Batangan", "Guilingan", "Kahaponan", "Lilingayon", "Lumbo", "Lurugan", 
    "Mailag", "San Isidro", "Sugod", "Tongantongan"
  ],

  // --- SOCCSKSARGEN (Region XII) ---
  "General Santos City": [
    "Lagao", "San Isidro", "Calumpang", "Labangal", "Fatima", "Tambler", "Bula", "Apopong", "City Heights", 
    "Mabuhay", "Dadiangas East", "Dadiangas North", "Dadiangas South", "Dadiangas West", "San Jose", "Siguel", 
    "Sinawal", "Tambo", "Upper Labay", "Batomelong"
  ],
  "Koronadal City": [
    "General Paulino Santos", "Sto. Nino", "Zone I", "Zone II", "Zone III", "Zone IV", "Morales", "San Isidro", 
    "Sta. Cruz", "Carpenter Hill", "Concepcion", "Esperanza", "Namnama", "Rotonda", "San Jose"
  ],
  "Kidapawan City": [
    "Poblacion", "Lanao", "Sudapin", "Singao", "Manongol", "Perez", "Nuangan", "Indangan", "Ilomavis", 
    "Amas", "Maceda", "Balindog", "Kalaisan", "Mua-an", "Mejia"
  ],
  "Tacurong City": [
    "Poblacion", "Baras", "Griot", "Lancheta", "New Isabela", "New Passi", "San Antonio", "San Emmanuel", 
    "San Pablo", "Calean", "E.J. Blanco", "Tina"
  ],

  // --- CARAGA REGION (Region XIII) ---
  "Butuan City": [
    "Ampayon", "Libertad", "Doongan", "Villa Kananga", "San Vicente", "Bancasi", "Poblacion", "Bading", 
    "Obrero", "Holy Redeemer", "San Ignacio", "Baan Riverside", "Baan KM 3", "Lumbocan", "Masao", "Mahogany"
  ],
  "Surigao City": [
    "Washington", "Taft", "San Juan", "Luna", "Lipata", "Rizal", "Sabang", "Cagniog", "Ipil", "Mabua", 
    "Togbongon", "Mat-i", "Trinidad", "Quezon", "San Jose"
  ],
  "San Francisco": [
    "Barobo", "Bitan-agan", "Borbon", "Buenasuerte", "Das-agan", "Ebro", "Poblacion", "Karaos", "Matin-ao", 
    "Lucac", "Tagapua"
  ],

  // --- BARMM & ZAMBOANGA ---
  "Cotabato City": [
    "Rosary Heights 1", "Rosary Heights 2", "Rosary Heights 3", "Rosary Heights 4", "Rosary Heights 5", 
    "Rosary Heights 6", "Rosary Heights 7", "Rosary Heights 8", "Rosary Heights 9", "Rosary Heights 10", 
    "Rosary Heights 11", "Rosary Heights 12", "Rosary Heights 13", "Poblacion 1", "Poblacion 2", "Poblacion 3", 
    "Poblacion 4", "Poblacion 5", "Poblacion 6", "Poblacion 7", "Poblacion 8", "Poblacion 9", "Bagua 1", "Bagua 2", "Bagua 3"
  ],
  "Zamboanga City": [
    "Tetuan", "Putik", "San Roque", "Sta. Maria", "Tumaga", "Pasonanca", "Ayala", "Baliwasan", "Calarian", 
    "Divisoria", "San Jose Gusu", "San Jose Cawa-Cawa", "Zamboanga", "Guiwan", "Boalan", "Tugbungan", "Talon-Talon"
  ]
};

export const cityToProvinceMap = {
  // --- DAVAO REGION (Region XI) ---
  "Davao City": "Davao del Sur",
  "Digos City": "Davao del Sur",
  "Bansalan": "Davao del Sur",
  "Padada": "Davao del Sur",
  "Sulop": "Davao del Sur",
  "Santa Maria": "Davao del Sur", 
  "Malita": "Davao del Sur",     
  "Panabo City": "Davao del Norte", "Dujali": "Davao del Norte", "San Vicente": "Davao del Norte", "Talaingod": "Davao del Norte", "Asuncion": "Davao del Norte",
  "Tagum City": "Davao del Norte",
  "Island Garden City of Samal": "Davao del Norte",
  "Carmen": "Davao del Norte",
  "Santo Tomas": "Davao del Norte",
  "Kapalong": "Davao del Norte",
  "Asuncion": "Davao del Norte",
  "New Corella": "Davao del Norte",
  "Braulio E. Dujali": "Davao del Norte",
  "Talaingod": "Davao del Norte",
  "Mati City": "Davao Oriental",
  "Lupon": "Davao Oriental",
  "Banaybanay": "Davao Oriental",
  "Governor Generoso": "Davao Oriental",
  "Montevista": "Davao de Oro", "LAAK": "Davao de Oro",
  "Nabunturan": "Davao de Oro",
  "Mawab": "Davao de Oro",
  "Maragusan": "Davao de Oro",
  "Mabini": "Davao de Oro",
  "Compostela": "Davao de Oro",
  "Pantukan": "Davao de Oro",
  "Maco": "Davao de Oro",
  
  // --- NORTHERN MINDANAO (Region X) ---
  "Cagayan de Oro": "Misamis Oriental",
  "Gingoog City": "Misamis Oriental",
  "El Salvador City": "Misamis Oriental",
  "Iligan City": "Lanao del Norte",
  "Malaybalay City": "Bukidnon",
  "Valencia City": "Bukidnon",
  "Maramag": "Bukidnon",
  "Kalilangan": "Bukidnon",
  "Manolo Fortich": "Bukidnon",
  "San Fernando": "Bukidnon",
  "Quezon": "Bukidnon",
  "Oroquieta City": "Misamis Occidental",
  "Ozamiz City": "Misamis Occidental",
  "Tangub City": "Misamis Occidental",
  "Claveria": "Misamis Occidental",
  "Bonifacio": "Misamis Occidental",
  "Don Victoriano Chiongbian": "Misamis Occidental",
  "Tubod": "Lanao del Norte",
  "Pantar": "Lanao del Norte",
  "Baroy": "Lanao del Norte",
  "Kapatagan": "Lanao del Norte",
  
  // --- SOCCSKSARGEN (Region XII) ---
  "General Santos City": "South Cotabato",
  "Sebu": "South Cotabato",
  "Koronadal City": "South Cotabato",
  "Polomolok": "South Cotabato",
  "Kidapawan City": "North Cotabato",
  "Midsayap": "North Cotabato",
  "Matalam": "North Cotabato",
  "Makilala": "North Cotabato",
  "Kabacan": "North Cotabato",
  "Carmen (Cotabato)": "North Cotabato",
  "Tacurong City": "Sultan Kudarat",
  "Isulan": "Sultan Kudarat",
  "Alabel": "Sarangani",
  "Glan": "Sarangani",
  "Malapatan": "Sarangani", "Mlang": "Cotabato",
  "Tboli": "South Cotabato", "Lake Sebu": "South Cotabato", "Surallah": "South Cotabato", "Tampakan": "South Cotabato",
  "Tupi": "South Cotabato", "Banga": "South Cotabato", "Norala": "South Cotabato", "Santo Niño": "South Cotabato",
  "Marbel City": "South Cotabato", "Tantangan": "South Cotabato", "Sultan Kudarat": "Sultan Kudarat", "Lambayong": "Sultan Kudarat",

  // --- CARAGA REGION (Region XIII) ---
  "Butuan City": "Agusan del Norte",
  "Cabadbaran City": "Agusan del Norte",
  "Buenavista": "Agusan del Norte",
  "Nasipit": "Agusan del Norte",
  "Santiago": "Agusan del Norte",
  "Bayugan City": "Agusan del Sur",
  "San Francisco": "Agusan del Sur",
  "Trento": "Agusan del Sur",
  "Surigao City": "Surigao del Norte",
  "Claver": "Surigao del Norte",
  "Bislig City": "Surigao del Sur",
  "Tandag City": "Surigao del Sur",
  "Bayabas": "Surigao del Sur",
  "Hinatuan": "Surigao del Sur",

  // --- ZAMBOANGA PENINSULA (Region IX) ---
  "Zamboanga City": "Zamboanga del Sur",
  "Aurora": "Zamboanga del Sur",
  "Pagadian City": "Zamboanga del Sur",
  "Dipolog City": "Zamboanga del Norte",
  "Dapitan City": "Zamboanga del Norte",
  "Sindangan": "Zamboanga del Norte",
  
  // --- BARMM ---
  "Cotabato City": "Maguindanao",
  "Datu Saudi-Ampatuan": "Maguindanao",
  "Datu Abdullah Sangki": "Maguindanao",
  "Parang": "Maguindanao",
  "Marawi City": "Lanao del Sur",
  "Lamitan City": "Basilan",
  "Isabela City": "Basilan",
  "Jolo": "Sulu",
  "Bongao": "Tawi-Tawi"
};