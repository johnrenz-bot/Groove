export interface Region {
  code: string;
  name: string;
  provinces: Province[];
}

export interface Province {
  code: string;
  name: string;
  cities: City[];
}

export interface City {
  code: string;
  name: string;
  barangays: string[];
}

export const PH_REGIONS: Region[] = [
  {
    code: '130000000',
    name: 'National Capital Region (NCR)',
    provinces: [
      {
        code: '133900000',
        name: 'Metro Manila',
        cities: [
          {
            code: '133901000',
            name: 'Manila City',
            barangays: ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Ermita', 'Malate', 'Paco', 'Pandacan', 'Sampaloc', 'Santa Cruz', 'Tondo', 'Intramuros', 'Binondo', 'San Nicolas', 'Quiapo'],
          },
          {
            code: '133902000',
            name: 'Quezon City',
            barangays: ['Batasan Hills', 'Commonwealth', 'Holy Spirit', 'Payatas', 'Bagong Silangan', 'Diliman', 'Cubao', 'Loyola Heights', 'Tandang Sora', 'Project 4', 'Project 6', 'Novaliches'],
          },
          {
            code: '133903000',
            name: 'Makati City',
            barangays: ['Bel-Air', 'Poblacion', 'San Antonio', 'San Lorenzo', 'Urdaneta', 'Guadalupe Nuevo', 'Guadalupe Viejo', 'Pio del Pilar', 'Bangkal', 'Palanan'],
          },
          {
            code: '133904000',
            name: 'Taguig City',
            barangays: ['Fort Bonifacio', 'BGC', 'Ususan', 'Tuktukan', 'Signal Village', 'Bagumbayan', 'Lower Bicutan', 'Upper Bicutan', 'Western Bicutan', 'Pinagsama'],
          },
          {
            code: '133905000',
            name: 'Pasig City',
            barangays: ['Kapitolyo', 'San Antonio', 'Ugong', 'Ortigas Center', 'Maybunga', 'Rosario', 'Manggahan', 'Pinagbuhatan', 'San Nicolas', 'Caniogan'],
          },
          {
            code: '133906000',
            name: 'Mandaluyong City',
            barangays: ['Highway Hills', 'Wack-Wack', 'Plainview', 'Barangka Ilaya', 'Barangka Itaas', 'Hulo', 'Malamig', 'Namayan'],
          },
          {
            code: '133907000',
            name: 'Pasay City',
            barangays: ['Barangay 1', 'Barangay 2', 'Barangay 76', 'San Rafael', 'San Jose', 'San Isidro', 'Maricaban', 'Villamor'],
          },
          {
            code: '133908000',
            name: 'Caloocan City',
            barangays: ['Bagong Barrio', 'Grace Park', 'Monumento', 'Camarin', 'Bagumbong', 'Deparo', 'Tala'],
          },
        ],
      },
    ],
  },
  {
    code: '040000000',
    name: 'Region IV-A (CALABARZON)',
    provinces: [
      {
        code: '041000000',
        name: 'Cavite',
        cities: [
          {
            code: '041001000',
            name: 'Bacoor City',
            barangays: ['Molino I', 'Molino II', 'Molino III', 'Molino IV', 'Queens Row', 'Panapaan', 'Talaba', 'Habay'],
          },
          {
            code: '041002000',
            name: 'Imus City',
            barangays: ['Anabu I', 'Anabu II', 'Bucandala', 'Malagasang I', 'Malagasang II', 'Palico', 'Poblacion', 'Tanzang Luma'],
          },
          {
            code: '041003000',
            name: 'Dasmariñas City',
            barangays: ['Salitran', 'Paliparan I', 'Paliparan II', 'San Agustin', 'Burol', 'Sampaloc', 'Langkaan', 'Zone I'],
          },
        ],
      },
      {
        code: '042000000',
        name: 'Laguna',
        cities: [
          {
            code: '042001000',
            name: 'Santa Rosa City',
            barangays: ['Balibago', 'Don Jose', 'Macabling', 'Malitlit', 'Market Area', 'Sinalhan', 'Tagapo'],
          },
          {
            code: '042002000',
            name: 'Calamba City',
            barangays: ['Canlubang', 'Halang', 'Makiling', 'Pansol', 'Parian', 'Real', 'Turbina'],
          },
          {
            code: '042003000',
            name: 'Biñan City',
            barangays: ['Canlalay', 'De La Paz', 'Langkiwa', 'Mamplasan', 'Platero', 'San Antonio', 'San Vicente', 'Santo Tomas'],
          },
        ],
      },
      {
        code: '043000000',
        name: 'Rizal',
        cities: [
          {
            code: '043001000',
            name: 'Antipolo City',
            barangays: ['Beverly Hills', 'Cupang', 'Dalig', 'De La Paz', 'Mambugan', 'Mayamot', 'San Isidro', 'San Jose', 'San Roque'],
          },
          {
            code: '043002000',
            name: 'Cainta',
            barangays: ['San Andres', 'San Isidro', 'San Juan', 'San Roque', 'Santa Rosa', 'Santo Domingo', 'Santo Niño'],
          },
        ],
      },
    ],
  },
  {
    code: '070000000',
    name: 'Region VII (Central Visayas)',
    provinces: [
      {
        code: '072200000',
        name: 'Cebu',
        cities: [
          {
            code: '072217000',
            name: 'Cebu City',
            barangays: ['Lahug', 'Mabolo', 'Banilad', 'Guadalupe', 'Apas', 'Talamban', 'Kasambagan', 'Punta Princesa', 'Pardo', 'Capitol Site'],
          },
          {
            code: '072226000',
            name: 'Mandaue City',
            barangays: ['Bakilid', 'Banilad', 'Centro', 'Guizo', 'Ibabao-Estancia', 'Maguikay', 'Subangdaku', 'Tipolo'],
          },
          {
            code: '072230000',
            name: 'Lapu-Lapu City',
            barangays: ['Basak', 'Buaya', 'Gun-ob', 'Mactan', 'Maribago', 'Marigondon', 'Poblacion', 'Punta Engaño'],
          },
        ],
      },
    ],
  },
  {
    code: '110000000',
    name: 'Region XI (Davao Region)',
    provinces: [
      {
        code: '112400000',
        name: 'Davao del Sur',
        cities: [
          {
            code: '112402000',
            name: 'Davao City',
            barangays: ['Buhangin', 'Matina Crossing', 'Poblacion', 'Talomo', 'Toril', 'Agdao', 'Bunawan', 'Calinan', 'Mintal', 'Sasa'],
          },
        ],
      },
    ],
  },
];
