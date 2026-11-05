export interface ElementData {
  number: number;
  symbol: string;
  name: string; // Tajik name
  weight: number;
  group: number;
  period: number;
  category: string; // 'nonmetal' | 'noble-gas' | 'alkali' | 'alkaline-earth' | 'transition' | 'halogen' etc.
  description: string;
}

export const PERIODIC_ELEMENTS: Record<string, ElementData> = {
  H: { number: 1, symbol: 'H', name: 'Ҳидроген', weight: 1.008, group: 1, period: 1, category: 'nonmetal', description: 'Сабуктарин унсури кайҳон, гази беранг ва бебӯй.' },
  He: { number: 2, symbol: 'He', name: 'Гелий', weight: 4.0026, group: 18, period: 1, category: 'noble-gas', description: 'Гази наҷиб, дар офтоб ва ситораҳо хеле зиёд аст.' },
  Li: { number: 3, symbol: 'Li', name: 'Литий', weight: 6.94, group: 1, period: 2, category: 'alkali', description: 'Сабуктарин металли ишқорӣ, дар батареяҳо кор фармуда мешавад.' },
  Be: { number: 4, symbol: 'Be', name: 'Бериллий', weight: 9.0122, group: 2, period: 2, category: 'alkaline-earth', description: 'Металли сахт ва сабуки ишқорзаминӣ.' },
  B: { number: 5, symbol: 'B', name: 'Бор', weight: 10.81, group: 13, period: 2, category: 'semimetal', description: 'Нимметалл, пайвастагиҳои он дар тиб ва саноат маъмуланд.' },
  C: { number: 6, symbol: 'C', name: 'Карбон (Ангишт)', weight: 12.011, group: 14, period: 2, category: 'nonmetal', description: 'Асоси ҳамаи пайвастагиҳои органикӣ ва ҳаёт.' },
  N: { number: 7, symbol: 'N', name: 'Нитроген (Азот)', weight: 14.007, group: 15, period: 2, category: 'nonmetal', description: '78% ҳавои атмосфераро ташкил медиҳад, ҷузъи сафедаҳо.' },
  O: { number: 8, symbol: 'O', name: 'Оксиген (Обиген)', weight: 15.999, group: 16, period: 2, category: 'nonmetal', description: 'Барои нафаскашӣ ва сӯзиш ҳаётан зарур аст.' },
  F: { number: 9, symbol: 'F', name: 'Фтор', weight: 18.998, group: 17, period: 2, category: 'halogen', description: 'Фаъолтарин ғайриметалл, гази заҳрноки зарди сабзтоб.' },
  Ne: { number: 10, symbol: 'Ne', name: 'Неон', weight: 20.18, group: 18, period: 2, category: 'noble-gas', description: 'Гази наҷиб, дар фурӯзонакҳои таблиғотӣ сурх метобад.' },
  Na: { number: 11, symbol: 'Na', name: 'Натрий', weight: 22.99, group: 1, period: 3, category: 'alkali', description: 'Металли мулоими ишқорӣ, ҷузъи намаки ошӣ (NaCl).' },
  Mg: { number: 12, symbol: 'Mg', name: 'Магний', weight: 24.305, group: 2, period: 3, category: 'alkaline-earth', description: 'Металли сафеди дурахшон, дар таркиби хлорофилл ҳаст.' },
  Al: { number: 13, symbol: 'Al', name: 'Алюминий', weight: 26.982, group: 13, period: 3, category: 'metal', description: 'Металли сабуки нуқрагун, барои ҳавопаймо ва зарфҳо.' },
  Si: { number: 14, symbol: 'Si', name: 'Кремний', weight: 28.085, group: 14, period: 3, category: 'semimetal', description: 'Асоси қум ва микросхемаҳои компютерӣ.' },
  P: { number: 15, symbol: 'P', name: 'Фосфор', weight: 30.974, group: 15, period: 3, category: 'nonmetal', description: 'Дар устухонҳо, дандонҳо ва нуриҳои минералӣ мавҷуд аст.' },
  S: { number: 16, symbol: 'S', name: 'Сулфур (Кибрит)', weight: 32.06, group: 16, period: 3, category: 'nonmetal', description: 'Моддаи сахти зардранг, дар кислотаи сулфат H2SO4 кор меравад.' },
  Cl: { number: 17, symbol: 'Cl', name: 'Хлор', weight: 35.45, group: 17, period: 3, category: 'halogen', description: 'Гази зард-сабз бо бӯи тез, дезинфексиякунандаи об.' },
  K: { number: 18, symbol: 'K', name: 'Калий', weight: 39.098, group: 1, period: 4, category: 'alkali', description: 'Металли ишқории муҳим барои фаъолияти дил ва растаниҳо.' },
  Ca: { number: 20, symbol: 'Ca', name: 'Калсий', weight: 40.078, group: 2, period: 4, category: 'alkaline-earth', description: 'Асоси оҳаксангу мармар ва мустаҳкамии устухонҳо.' },
  Fe: { number: 26, symbol: 'Fe', name: 'Оҳан', weight: 55.845, group: 8, period: 4, category: 'transition', description: 'Муҳимтарин металли саноатӣ, дар гемоглобини хун мавҷуд аст.' },
  Cu: { number: 29, symbol: 'Cu', name: 'Мис', weight: 63.546, group: 11, period: 4, category: 'transition', description: 'Металли сурхчатоби ноқили аълои барқ ва гармӣ.' },
  Zn: { number: 30, symbol: 'Zn', name: 'Рӯҳ (Синки)', weight: 65.38, group: 12, period: 4, category: 'transition', description: 'Барои пӯшонидани оҳан аз занг ва дар ферментҳо.' },
  Ag: { number: 47, symbol: 'Ag', name: 'Нуқра', weight: 107.87, group: 11, period: 5, category: 'transition', description: 'Металли аълосифат бо баландтарин гузарониши барқ.' },
  Au: { number: 79, symbol: 'Au', name: 'Тилло (Зар)', weight: 196.97, group: 11, period: 6, category: 'transition', description: 'Металли қиматбаҳо ва тобовар ба зангзанӣ.' },
};

/**
 * Calculates molar mass and element breakdown for chemical formula strings like H2O, H2SO4, CaCO3, Al2(SO4)3.
 */
export function calculateMolarMass(formula: string): {
  totalMass: number;
  breakdown: { symbol: string; name: string; count: number; massPerAtom: number; totalContribution: number; percentage: number }[];
  error?: string;
} {
  const clean = formula.trim().replace(/\s+/g, '');
  if (!clean) return { totalMass: 0, breakdown: [] };

  // Parser supporting parentheses, e.g. Al2(SO4)3 or Ca(OH)2
  try {
    const counts: Record<string, number> = {};

    function parseGroup(str: string, multiplier: number) {
      // Regular expression to match Element (e.g. He, H, Ca) or Group ( ... )
      const regex = /([A-Z][a-z]*)(\d*)|(\(([^)]+)\))(\d*)/g;
      let match;

      while ((match = regex.exec(str)) !== null) {
        if (match[1]) {
          // Element
          const elem = match[1];
          const count = match[2] ? parseInt(match[2], 10) : 1;
          counts[elem] = (counts[elem] || 0) + count * multiplier;
        } else if (match[3]) {
          // Parentheses group
          const inner = match[4];
          const groupCount = match[5] ? parseInt(match[5], 10) : 1;
          parseGroup(inner, multiplier * groupCount);
        }
      }
    }

    parseGroup(clean, 1);

    let totalMass = 0;
    const breakdown: any[] = [];

    for (const [sym, count] of Object.entries(counts)) {
      const el = PERIODIC_ELEMENTS[sym];
      if (!el) {
        return {
          totalMass: 0,
          breakdown: [],
          error: `Унсури "${sym}" дар базаи додаҳо ёфт нашуд. Лутфан имлои формуларо санҷед (ҳарфҳои калон ва хурд, мисли Na, Ca, Fe).`,
        };
      }
      const contrib = el.weight * count;
      totalMass += contrib;
      breakdown.push({
        symbol: el.symbol,
        name: el.name,
        count,
        massPerAtom: el.weight,
        totalContribution: contrib,
        percentage: 0,
      });
    }

    if (totalMass === 0) {
      return { totalMass: 0, breakdown: [], error: 'Формулаи химиявӣ нодуруст ворид шудааст.' };
    }

    breakdown.forEach((b) => {
      b.percentage = Math.round((b.totalContribution / totalMass) * 1000) / 10;
    });

    return {
      totalMass: Math.round(totalMass * 1000) / 1000,
      breakdown,
    };
  } catch (err: any) {
    return { totalMass: 0, breakdown: [], error: 'Хатогӣ ҳангоми таҳлили формула.' };
  }
}
