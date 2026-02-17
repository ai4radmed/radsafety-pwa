import { supabaseAnon } from '../lib/supabase-server';

export interface Term {
    id?: string;
    term: string;
    definition: string;
    category?: string;
    sort_order?: number;
}

// 폴백용 정적 데이터 (DB 연결 실패 시)
const FALLBACK_TERMS: Term[] = [
    {
        term: '허가사용자',
        definition:
            '원자력안전법 제53조에 따라 허가를 받고 방사성동위원소 또는 방사선발생장치를 생산, 판매, 사용 또는 이동사용하는 자를 말합니다.',
        category: '인물/자격',
    },
    {
        term: '신고사용자',
        definition:
            '밀봉된 방사성동위원소 또는 방사선발생장치로서 방사선량이 적은 것을 사용하기 위해 법 제53조제2항에 따라 신고를 한 자를 말합니다.',
        category: '인물/자격',
    },
    {
        term: '방사선안전관리자',
        definition:
            '방사선 안전관리에 관한 기술적인 사항을 관리·감독하고, 방사선재해 방지를 위해 선임된 사람으로 원자력 관계 면허를 소지한 자입니다.',
        category: '인물/자격',
    },
    {
        term: '수시출입자',
        definition:
            '방사선관리구역에 청소, 시설관리 등의 업무상 출입하는 사람(방사선작업종사자 제외)으로서 안전관리자의 안내에 따르는 사람을 말합니다.',
        category: '인물/자격',
    },
    {
        term: '방사선작업종사자',
        definition:
            '방사선관리구역에서 방사선 이용 시설의 운전, 조작, 점검, 보수 등 방사선 피폭 우려가 있는 업무에 종사하는 사람입니다.',
        category: '인물/자격',
    },
    {
        term: '방사선관리구역',
        definition:
            '외부방사선량률, 공기중 방사성물질의 농도 또는 방사성물질로 오염된 표면의 오염도가 원자력안전위원회규칙으로 정하는 값을 초과할 우려가 있는 곳으로, 방사선 방호를 위해 사람의 출입이 관리되는 구역입니다.',
        category: '장소/시설',
    },
    {
        term: '자체처분',
        definition:
            '방사성폐기물 중 방사능 농도가 법적 허용기준 미만인 경우, 원자력안전위원회의 규정에 따라 일반 폐기물로 소각, 매립, 재활용하여 처분하는 절차입니다.',
        category: '폐기물',
    },
    {
        term: '표면오염도',
        definition: '물체 또는 인체의 표면에 묻어 있는 방사성물질의 양을 면적당 방사능(Bq/cm²)으로 나타낸 값입니다.',
        category: '측정',
    },
    {
        term: '공간선량률',
        definition: '특정 공간에서의 방사선의 세기를 나타내는 단위로, 보통 시간당 마이크로시버트(μSv/h)를 사용합니다.',
        category: '측정',
    },
    {
        term: '선임',
        definition:
            '방사선안전관리자 등 법적 자격 요건을 갖춘 자를 해당 직무 수행자로 지정하여 원자력안전위원회(또는 한국원자력안전기술원)에 보고하는 행위입니다.',
        category: '행정',
    },
    {
        term: '정기검사',
        definition:
            '허가사용자가 허가받은 사항대로 시설을 운영하고 있는지, 안전관리 규정을 준수하고 있는지 매년(또는 주기적으로) 확인하는 법정 검사입니다.',
        category: '행정',
    },
];

export async function fetchGlossaryTerms(): Promise<Term[]> {
    try {
        const { data, error } = await supabaseAnon.from('glossary_terms').select('*').order('sort_order');
        if (error || !data) return FALLBACK_TERMS;
        return data;
    } catch {
        return FALLBACK_TERMS;
    }
}

// 하위 호환: 기존 import 유지
export const glossaryTerms = FALLBACK_TERMS;
