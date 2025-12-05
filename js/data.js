const ESG_CATEGORIES = [
    {
        id: "E",
        title: "Environmental (환경)",
        description: "환경경영, 친환경 실천",
        middleCategories: [
            {
                title: "1. 환경경영 추진체계",
                indicators: [
                    {
                        id: "e_goal",
                        title: "지역사회가 공감하는 목표수립 과정",
                        contents: [
                            "① 환경경영을 위한 친환경, 사회적 가치실현을 위한 의사결정과정을 종사자 및 이용자와 함께하고 있음.",
                            "② 환경경영에 대한 구체적인 목표가 수립되어 있음.",
                            "③ 기후위기에 대응할 수 있는 지속가능한 환경경영목표를 내･외부관계자, 지역주민과 함께 수립하며 결과, 성과를 공개하고 있음."
                        ]
                    },
                    // Add more indicators here...
                ]
            },
            // Add more middle categories here...
        ]
    },
    {
        id: "S",
        title: "Social (사회)",
        description: "인권, 노동, 지역사회",
        middleCategories: [
            {
                title: "1. 인권경영",
                indicators: [
                    {
                        id: "s_human_rights",
                        title: "인권보호 체계 구축",
                        contents: [
                            "① 이용자 및 종사자의 인권 보호를 위한 규정 및 절차가 마련되어 있음.",
                            "② 직원의 안전과 보건을 위한 환경이 조성되어 있으며 정기적인 점검을 실시함."
                        ]
                    }
                ]
            }
        ]
    },
    {
        id: "G",
        title: "Governance (거버넌스)",
        description: "윤리경영, 의사결정",
        middleCategories: [
            {
                title: "1. 윤리경영",
                indicators: [
                    {
                        id: "g_ethics",
                        title: "윤리경영 실천",
                        contents: [
                            "① 기관의 투명한 운영을 위해 경영 정보를 온/오프라인에 공개하고 있음.",
                            "② 윤리 경영 실천을 위한 내부 규범이 마련되어 있으며 교육을 실시함."
                        ]
                    }
                ]
            }
        ]
    }
];

const CHECK_OPTIONS = [
    { value: "know", label: "알고 있음" },
    { value: "dont_know", label: "알지 못함" },
    { value: "doing", label: "하고 있음" },
    { value: "not_doing", label: "하지 않음" }
];

