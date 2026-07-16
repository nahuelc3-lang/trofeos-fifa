let datosPartidos = [];
let torneosOrdenados = []; 
let fechasPorTorneo = {}; 
let partidosPorFechaYTorneo = {}; 
let miGrafico = null; 

let cacheHistorialGlobal = {}; 

let clubSeleccionadoActivo = "";
let filtroTipoActivo = "torneo"; 
let filtroValorActivo = "ultimo"; 
let modoMetricaActivo = "posicion"; 

// DICCIONARIO DE ALIAS: Corrige nombres escritos distinto en el CSV
const aliasEquipos = {
"estudiantes": "estudiantes (lp)",
    "estudiantes de la plata": "estudiantes (lp)",
    "estudiantes (rio cuarto)": "estudiantes (rc)",
    "estudiantes de rio cuarto": "estudiantes (rc)",
    "argentinos": "argentinos juniors",
    "boca": "boca juniors",
    "river": "river plate",
    "gimnasia": "gimnasia (lp)",
    "gimnasia y esgrima la plata": "gimnasia (lp)",
    "gimnasia y esgrima (la plata)": "gimnasia (lp)",
    "gimnasia de la plata": "gimnasia (lp)",
    "gimnasia (mendoza)": "gimnasia (m)",
    "gimnasia y esgrima (mendoza)": "gimnasia (m)",
    "gimnasia de mendoza": "gimnasia (m)",
    "san martin": "san martin (sj)",
    "san martin sj": "san martin (sj)",
    "san martin de san juan": "san martin (sj)",
    "san martin t": "san martin (t)",
    "san martin de tucuman": "san martin (t)",
    "central cordoba": "central cordoba (sde)",
    "sarmiento": "sarmiento (j)",
    "talleres": "talleres (c)",
    "atletico rafaela": "atletico de rafaela",
    "newells": "newells old boys",
    "newells old boys": "newells old boys"
    "newells old boys": "Newell's Old Boys"
};

// DICCIONARIO DE ESCUDOS (2012 - 2026)
// Reemplazá "URL_ACA" con el link de la imagen o la ruta a tu archivo local.
const logosEquipos = {
    "aldosivi": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjYLTS9PrLZVE7UP-Uik6iz9jCN52PMfWsJKdWvPYuKzSXG-_Ti_vZlFQEE_8usH9wtg_y3By5Sc-Dq6h6KPDudFl-176QyNxk75GeOu6snFYmbHnKNGhHiQaBbJ1GqihS-WXANCOoadhwT1KnimCOLaoGMbmaKsBXSCdjar0-Y_fP3vg8A4_6jIvF5/s1600/Club%20Atletico%20Aldosivi128x.png",
    "all boys": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjjBTKE3RImNmGGbOG-xY2II7CZH6VtUgW8S_j8LhP1dSX-PfvBic-IjLVCO3DX9OaAuvCLRII8PJqmJtxQJG9Cjr_HYVzSiHcJkqTR7TtTRgl712TYa9nKjDvtCXpxdWXRsOuZHoYR6glICoVk79EJXGJeDSAu2_XhvkYqDz2plAjDYwNmSIPZ9F7g/s1600/Club%20Atletico%20All%20Boys128x.png",
    "argentinos juniors": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjlhaXsbedTImUrW4LsuLMzJ714Xo355W4iK-bbQY_6SDwuVGbm1f9RL3rtNkfqmdTmLQprVMVQ-T8aVryTtp1qXvzzm6lKMDChKBXzg3pC-sDefiWyIRStS0czof2sKpAlud6tSfgYLD0/s1600/Argentinos+Juniors128x.png",
    "arsenal": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiQjFWD9Orw6a83FcR3Zoch1iEVjZljtyqPBML1VuE6A3FtHv4Z3HFCIZrKbO5csJrtQJVu45Eu4pH6FCgiqh7TBq_SG8z23nQs16UChl4aOUDprqHsLktaxfC2Hc5B-t0JQ7ZXh3w0MfY/s1600/Arsenal+Futbol+Club128x.png",
    "atletico de rafaela": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiK3oxcpUwRHw5wWXv20Lt4V0QNmHD2sLiFhX93tJ-dnVWZevWjbizoYIm5LHzVrDfriX2068fz1FkTjZi3_0aQFJ03zlv1pVd3fKfmPvj4DEvf6QZ1L47zl0n8uwgFRm9hmpiYM-BP7PA/s1600/Atletico+de+Rafaela128x.png",
    "atletico tucuman": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiGBJfU3aRLSteWSER8lobIpNEpbaWlfqx7EvaKZtMsPLxgji_tqG3c-Mmf93GSaFYjJ20DcIUXyJkg6xY-u79sHJSzrMG-_bTtcAZnQnvtQ5DLF9xPDc-R85ZpNQDuk-EhvTCg48q7QH34uEUmF4wlkoLdtheCOHg4yOHg2goolWv8-0jZWSUYNYnMZj0/s1600/Club%20Atl%C3%A9tico%20Tucum%C3%A1n128x.png",
    "banfield": "https://blogger.googleusercontent.com/img/a/AVvXsEiZEUKPDYSMC8jq9i_h2MW4sW5PAODO1tsTY46lGoIuQMphpA0kLQmmVb_DfE85Fgd6rwct9FF_2LYz7T4qjj4RXqAykFFLLgtwHgDEKyQ7IlSYf8IPh3dCXXITgK_2JMhqaautnTRIoLGaBXB4dxQzpqaciKgnRc51bQBqGetAvooSZiRgBM0_cAH9",
    "barracas central": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjsk-bPNfH9eCqD12pv_CwL1BuNUAxrKPjH0aIKMhsh-tkiNO7ZB6B7sVsH0UVGCK7WJQ1FWGubVs7NUyaW3SPG7DEAiIYbIos_masxv3AMn6NCJeiR5JwEDk3bUoRt90a00T-HgeswNYyiR3HHPx_wnLdq464rw5IS6AWp7t9WzRwDWrt7nFDAmuEO/s1600/CA%20Barracas%20Central128x.png",
    "belgrano": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjG0uaNSNb6Uwoy5vF30ZXEaLfasLlBVZhM3-_a9PxYpWsV2jOfH-f68iKJqD186p06Kkd0uYANyifn5toHP2tIbOOjVXwnMbcim4Nc5PHpHtdEFjELQNFGRjfpFvp9b_g5tThF8VGywsPE2BELihpO2_0CsRC96vOiITvEqRR08hxEdnIqk2lbgS3nBLg/s1600/Club%20Atl%C3%A9tico%20Belgrano128x.png",
    "boca juniors": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjOL0rL1mnaqAIv_9cWnQayBcfquddQxXR82Ho7GG9YdcQjYhK077s3wlCOM1Z1OExJShV-b-f3Yzuoq049fzMYoRvgwR06s99-ezsl4uki7P80_dKIxjtIO4kDkpJNbJTxG-K2jS8xkKzvkTgkVXfy2sosC1ZROpCqNkNCiGJBhKbV9_u86I0Bq4wsNgM/s1600/Boca%20Juniors128x.png",
    "central cordoba (sde)": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi4SrYADliV740-Ma8xnLa1b1lPaYuj_5obigcy34-l2ORW-l1mJq_A6LlDcN4yYSTh1bQMaZj2TvXFiVNqVXJQBdZua1lN12M8vVXUBZvgPRFTR5iSd1ASy3S6sbs5nMODxupK9d84fwDpYWXNxhY_Z4GcaZmBTDunVA7SMqFmdlAC2toh2WkaG75XZMs/s1600/Club%20Atletico%20Central%20Cordoba128x.png",
    "chacarita juniors": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhIG_McsGv3mxdN-op7xXA5jM-b8XKLK7Sk4LUkyxPXPZ7eoei4b4F0MOVRXcMDSnXuafBJfpYxE79KogeR-AcAqdCFdnFTL30Ey1-r4IUuc8Tek1Q_oZQR5Zi8WaZ9H9jEL10ZBLqobtffgolIWsPfsD8bswtHMA_zNiZHvOIWjwZRIZcOjOj1LY2ItQE/s1600/CA%20Chacarita%20Juniors128x.png",
    "colon": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhzGFwFMkXyTIz-88dXiQFafSqUYWzpcLMP4lYkPxlKhTuYhSMbZsPklaPIQQjivQUeNbo19j_u_wTAjEq8OtDywWw257_MftakdeMbcPHOkd8OdytNVOu-00LYzMFoay2I09MZ4gQYYEM/s0/Club+Atletico+Colon128x.png",
    "crucero del norte": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjdRJJJ7vhIBD5emoCIWajeaF6vgLYNxRalAA419ygA1yObWECOBfPZyifX6zEG08LVAmWy7u6pROvMOyHhmCuwwtiGUXljmVLDS91QN9Tz48oKjZ69z9BK_Xihy7ox-_I4pFwnBRceqtyF/s1600/Club+Crucero+del+Norte128x.png",
    "defensa y justicia": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhH2OEayYViOITgGkRO33d33v9Zer-9OjYv2RYMWpI9JesyTsTGh-Wope5SZx5kH7YvPf1tMjWaWBJDkF8lQTNE8W7vXaJxKeggNo9_m4blMOShfcABgJwq2YEIklhiHvohPB9dY06B1lU/s0/Club+Social+y+Deportivo+Defensa+y+Justicia128x.png",
    "deportivo riestra": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiwYG_qkLvctt1uDooMsd3Cf85QsMELoyh_JwXhfde-B9QF8flb3_gjujJgzFzGOWrRjtwPjgSC-i2Cal2MRxZ5JOvmxneQZ52pWGUPRAmb8DRKegYhKlU1z4XWSMBGkXOJENo1WWayVtUjaprF9BxwrrfHU93PDfZRLqwVrhmCh1XXrgF_IZkSU4mSjbA/s1600/Club%20Deportivo%20Riestra128x.png",
    "estudiantes (lp)": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgoOjD68Co76GwEpbBxPM_QaEiagf3vJHpk5GGDbizMLmfNv1Oa-g7lPDVBP906DKPN10B8P5_K4L8LYdLbC5NqSkFPHQrCGIeypuTeltR8mqltZplU8ucGvDqOvEteSKVbdqAPb9vbTjq2eopnuN1-q4KAMXPS6l-bvv-Y0obBOg1IcKCzl5c1LBRCVpg/s1600/Club%20Estudiantes%20de%20La%20Plata128x.png",
    "estudiantes (rc)": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhxDYiVghrEwPKVH8fnB4JVIjSQYOa1ByEcrRhY_hIaThhWi3wvPu3eSQTKxH41p9Mgrw9133vLnDidORdM2z2PkI8_t0HQK6aKiZZst7r-yQxRsGji7NM5q5YmMRqpDumz9pr1WvH_Xk22VRe33nZaVW5wb71lQyMb1JKFeMU6hnDmD4wEo-Wg8Lo-/s1600/Asociacion%20Atletica%20Estudiantes128x.png",
    "gimnasia (lp)": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEj4HjdHQpm6ukoVe_oFSjYvx3iYZYHNJPuDTSU9OtW95Fm_Or0JY68W1Z_UUYnxbHl92Ri1FwjNYZ_fBghTnp4EFKF6HhvIlRmBjOCgxzJBpywxNZLI7zz046A3J-YY8LqZcqyAJiOGfH4/s1600/Club+de+Gimnasia+y+Esgrima+La+Plata128x.png",
    "gimnasia (m)": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgDnI3ab6gLK5h4E3ghOYRRVtdzOdcv8z8WgbOMTP9oiz1NrflNq5CnDPM71INkz9ThbeHhwWhXbBjcsCx3EHHIgkI7NmFdji4wbFAf5t5cmCYpPThZxd65fmsMNp991FHz5jYtCX207wI/s1600/Club+Atletico+Gimnasia+y+Esgrima+Mendoza128x.png",
    "godoy cruz": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi80fnjA1MthG6UeuRC0g50bIY82iC9Vev2JXPkSmexHnf7WIR34BwkcrrxgxD2NMIKP-RUyTiCa6lJ3FRhF64UNVpWkBy58zfo62oz1RgwkL4s5GwtEZOuhAMc7ZZ3EOYzTq4QMqV2aT9dQ9KJzNG3oFi5uxO5M9wv0YtkSxSZP2imTV2CJZK5a2BquQg/s1600/Godoy%20Cruz128x.png",
    "huracan": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhZ5D1BTENTDFFp9u4q4FFwLVy2aLsW5bDUpI-0PH0c_ftcV1H8SiY70y8_PsygAyRCm3gcdYo625ObGsIemzkA9w-ouuaPYgvassM678QSj6JllObbUQy_TvsttPuMskI_3JwDEksu4QI/s1600/Club+Atletico+Huracan128x.png",
    "independiente": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEimsJgFxyJXwpXGV_uPf9mBgwnx_Yp8UDgyOxZGLgUK0HoisEqPNa6rZfFHKEnLKlxII9hFeSRsnQ077Iz9nWR3LMZEvQbEWDl3L_LlpkIpN_X4_GW3vHFtxYNYz0jUmafXGyg1tbvN_0Iokh9SydpqgD72ByRPRCHz01ZgON769GQG6npXUmgIB-heLBw/s1600/Club%20Atletico%20Independiente128x.png",
    "independiente rivadavia": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhm7gIKplIfAqUe3Lcxfj4_rzdzMmklVEKSrAHtS4gv20f51QBF4ZJQhoZ2T2lfycrCT6OqiEGbuLuLGW34sl0Sp7HOnbE-0ItTnp1lI7uG9oY4pNysra_pwCCsEVcKWyI2HAKHIe3IQEQUu4Evu2zLmkmycZ6eJPmt-6QFtxw5L5XHQDYzZM-EZotxhyphenhyphenE/s1600/Independiente%20Rivadavia128x.png",
    "instituto": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh-MtsodoQ123uMzWKDD7Q3xFwVO9XRELj1pEUvlWkyEMCSEKKdwXfcFRH1PvIzo0amHjppMz1TQtawcb0Wq9ewxiGMAp1LKsL4r-pUbuNDsqSGI9N8ywZzwxYTOS7cXFqXUWllRAZgmQM/s1600/Instituto+Atletico+Central+Cordoba128x.png",
    "lanus": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgY0LCvqZHXem9kWtHYUM9sgTasj7XkYDtm9xGPZcXBWdWzAC9MDJPd9T06FbroMSZjaepTDjao038Vz7grV41lvC0-kY5FCv5YdlVLaDDxRv8R-9-OZ4VZBcloZbV9vRxfyBU_LJF8BYx2FpTOsIw_vKaWAMOYwd1OM3dfw-8VlCF9i2tH-kD-r85UsQ4/s1600/CA%20Lanus128x.png",
    "newells old boys": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhKxWx4tXSkJVEzqgz-TuYHh34vVYlJaRG0IfjRcjnHMnv-Bg_7PuDuYsqlwJlCC3P2LCnDGrmSkouKy9bY3abxtqhGRzDd1P0xULGxVFvT_gRz9r1zyTOSbkOH_hPMwi7RxOwr-O5FMyU/s1600/Club+Atletico+Newells+Old+Boys128x.png",
    "nueva chicago": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhc5711xbOPjJyJq7ZjLs2_S4Gsb2LR80ACrK8oaYlbAif5QSdrAzGRldfrHhaw3-Q-btSqPkskaDaY8_YP6Df9QHmZuOKc8bZe19vcc32IrVmSQOSY5UHJ4ycEYfkRUjTveST7ACt22B4gU4UMz4z3CJBfgf-HPPDn2jwXY797JnaUKP92BazW-_qoLcs/s1600/CA%20Nueva%20Chicago128x.png",
    "olimpo": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjk6Tc9DV0TJG4d9RRxtaHBJrzupxv522uCLzupMLyqJp_caSba8JXDjlgFzPZ6HrUpuxa5JCAISMWeFZ-O0fLSpmQw29t3tuqhNmMfWn6NafL2eqzlKiwKIhqonqq3eJ4gJLIcMEmSPkk/s1600/Club+Olimpo128x.png",
    "patronato": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhHSVELQxaixKKf-HBJqJ2R5HecTYm_fXbRLrJ-w9Vtj1QVvwJUpYJ_iefWcvgVWSavRtp9LK-bGwGmqYBZXsBdPMz0vgohD1UmmvdRiWsKzvSYQuJGGkfdSc7w2YD8vKfESTyN-fwdgQlWp430iFugtNR5r9h3pmSiU4ivZnfOzNAi8JyHm7vyFN-l/s1600/Club%20Atletico%20Patronato128x.png",
    "platense": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjRrSFevGRklwVlwuo8iOX1B7g8GpGOR-RU1ud9dz7w2XWH5tJIiOBG731fLpH-9GuoOI9cHM87TUnYZ5-vpaNR_18jx4AsSUOcmK8kNA4dn-WiocZrrhJzxxbk-raS9wPCEKyLWJteZ8ReiHUgXlSvO7KvNuNAxLDmbcR9YqDH9MlHs3nMgPtzPbECITg/s1600/Club%20Atletico%20Platense128x.png",
    "quilmes": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiU4tDo5BSy4w7raZp9zycKpa3bvG-IZf0uJWqgzNeNOx398I4FwgOzyyrGi6k1wPmLE6QdJrl20-evWySYw7ONy3xNPR2lpPvv4empkc7UOhNlyRYlI4rs5WW0Vnwkmjf5y5BVXXIbsOOYKZlAD55DmTvhm0sz5-MWoj30mnSwmGz_OZlN2-VvLIgJ/s1600/Quilmes%20Atletico%20Club128x.png",
    "racing club": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEghWvSJWCrUF8u2JceuoExqUlFdSH_8ikgsw-3Mv8-CblPsDANkhTcB3yCOFufq7FH8rgreONKj2yjO4dIAVZAOjM0LP5Stm6dvBbp78TSLkNSDvXcV_qhvm3nsUKHNNbBkXcwU5pD8Sak/s1600/Racing+Club128x.png",
    "river plate": "https://blogger.googleusercontent.com/img/a/AVvXsEgTBK7xhnKu2_r_QmZQ1cTNMJsILgHkg9qmEPHvBzWp1YNXQ3yacqii16J9eEz6cUWXrd74cT0d4YE6vTg4bl9rI8zpYAR0AFadmDoF97IZyeHTCSauM9cqvXIwX2zfxk24E_uso78IpGptZ83ITlmLnK9itXSmq2rwz5t_e8XrzwCU_tgCMN8R1DZQ",
    "rosario central": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgCm7IJilwhaIvOVMhJmrp42mFKUkPTiqQEBDNAx8IS9xUSvkdjB1YiWUpl_bGptgX6EXHbCS1Pf3Jbwu-f26fGtOldGlJAc-i-QxwIP6NlfPm5mBXJE1YzpGYKR7aTZJ5wJBSIAlrD0y5FCe4D4fuyGkx-7hCRs6-x-cnBbNmiW9jmyB6ZVllbGuDynu0/s1600/CA%20Rosario%20Central128x.png",
    "san lorenzo": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjG68ZrPNvlFuKIWw939yae1SX0fPGSOuAa_8OdtNaJzTGrIYyLXa0gkPFE827tFP8-wI838QyD6kiAxOR-JN3QVejwDWp2pnq38jB1rHlMeqZb5eGDETr42_SrhEU_qz9yfsT8rGxvbh04gd-pdUNap6iL7fez26aBNAuUl1sd_EmA3WziFEHCc2UZIVY/s1600/CA%20San%20Lorenzo%20de%20Almagro128x.png",
    "san martin (sj)": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgEWIIKyRnzdyJieAvWGSa2lMn2vG6bgQmAGtupHsCg8pH20m1aZaZaH-uE7bovgguXr1qhZ2pPyp48tWwu0L80WRF65f9PJ_q2-uwyj8AoWuSlbsIHGlUQEIRFqH82YfrODi_OBvdjk9SGwNXrFFURhO-5iP30K4XC_MKrdD_z8koyxhPcD0DXSFbbQ94/s1600/Club%20Atl%C3%A9tico%20San%20Mart%C3%ADn128x.png",
    "San Martín (Tucumán)": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjpBGKSCCAmo9EDkMIxWTnIQ4zhR7fUcaee9oaiNTX3K6YC8OopjcNVNgqjmF1Mx9sULwwy5mQJnjwJNb3QNsJZeerFD5m3yvlzITAPprJQRnIhjimaeywLBY_5CycbQl7UZl9mA4UGROk/s1600/Club+Atletico+San+Martin128x.png",
    "sarmiento (j)": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiOm5IHpBKTvNVI2oQsYF4jEUTPoYIwnqQHBf7h__5zoUpJAUEvM6h5HWH8HQ9AGnqo-t7za54gvJlXOgR80MJHbFWbwur2U_j_-fjtYSnBZqMcxcxC5XY_jD_O_6sKKvJddXl_LpjVA-M/s1600/Sarmiento+de+Junin128x.png",
    "talleres (c)": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjrj-EZz7CmNG6m_Fa7Q3w1CcUORXE8k1tWkOeY_N-egX754nAJWchSjs55lARBlu-T9bG5twJNd-xn5gIzHCmL5iQSG-pl0ZBIzWfgATG7dz7bp4go3c4CRjarxwjQDCgtADnxY5eudgRhIWTJ1vP5gPOyoXpmS5E6EvcfyQxuFlkLmUGAMcDlBsvLKMI/s1600/Club%20Atl%C3%A9tico%20Talleres128x.png",
    "temperley": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiAHHO7kQm_DDJGUwdpUTKXGatGZ9o-Ov1oCrsVtgeqq0Xoq-oFGq0YEBdRkLYU6-J6LJAeOcCmUNNjt_o25q2PCPy-6WVzAsQwYpkVkD1x3bb2mv4ePkYvLyISfKetj7Cp60gya39Gadg/s1600/Club+Atletico+Temperley128x.png",
    "tigre": "https://blogger.googleusercontent.com/img/a/AVvXsEheE2-jT6jhVGlGIRdZPJwS_A7uR_WMCHIQvTd1mUCqJNOau42BT_qO4tWzf7lRE5DJZqKhwo1JDkyQsn5ayntCNsHeCGVFsylbFmRNe8vhjhmHfgdMvJImq74xDJ6fIuvcxTTVg2YDsDzh37D568XL8A1AkCZZm2BkKqwtrA6ezoAVtEKqxEtFHoYs",
    "union": "https://blogger.googleusercontent.com/img/a/AVvXsEglXo8V_6pxTEHZ-c81Q37Y42rQ80ittTUvm265m9VL8D_vv8_D14wdxqjyDUHW9UtsTBIliG2_Im-BdrFyvmf7ZfIe_rso9ejGquWbD7W8jxDz31BO40uw3kKwJPnGxdMasorbQSPGkIFHgMFm-ImXrbZ14Q-5-rV5hpqhhWlJpDJ9NqHcmFwbrjYC",
    "velez sarsfield": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEirp6aRrGW9ehZvYes7b_Lsz1nHmke4k3nV_Knh_zcmgVpEbFhqWiN2-tJGGOcNU00R2uudedXBlqZBIX0ldnSOw5W6JNB82FR5Kr8qEjseU6xRTPxRE5gsMRuxjLzX1eN84kwHKugkoZYqLCISFFubWIbCNtPZMIYTXdqU6RgLOh9UcQQj-MOJspTL/s1600/Velez%20Sarsfield128x.png"
};

function obtenerURL_Escudo(nombreNormalizado, nombreReal) {
    if (logosEquipos[nombreNormalizado] && logosEquipos[nombreNormalizado] !== "URL_ACA") {
        return logosEquipos[nombreNormalizado];
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(nombreReal)}&background=00285e&color=fff&rounded=true&bold=true`;
}

function arreglarCodificacion(texto) {
    const mapa = {
        'Ã¡': 'á', 'Ã©': 'é', 'Ã­': 'í', 'Ã³': 'ó', 'Ãº': 'ú', 'Ã±': 'ñ', 'Ã‘': 'Ñ',
        'ã¡': 'á', 'ã©': 'é', 'ã­': 'í', 'ã³': 'ó', 'ãº': 'ú', 'ãñ': 'ñ'
    };
    let resultado = texto;
    for (let mal in mapa) {
        resultado = resultado.split(mal).join(mapa[mal]);
    }
    return resultado;
}

function obtenerCampo(objeto, campo) {
    if (!objeto) return "";
    const campoLower = campo.toLowerCase().trim();
    if (objeto[campo] !== undefined) return objeto[campo];
    for (let k in objeto) {
        if (k.toLowerCase().trim() === campoLower) {
            return objeto[k];
        }
    }
    return "";
}

function parsearFechaStr(fechaStr) {
    if (!fechaStr) return new Date();
    let partes = fechaStr.split('/');
    if (partes.length === 3) {
        return new Date(partes[2], partes[1] - 1, partes[0]);
    }
    return new Date(fechaStr);
}

async function leerCSV(archivo) {
    const respuesta = await fetch(archivo);
    if (!respuesta.ok) throw new Error(`No se pudo cargar ${archivo}`);
    
    let texto = await respuesta.text();
    texto = texto.replace(/^\uFEFF/, ''); 
    texto = arreglarCodificacion(texto);
    
    const filas = texto.trim().split(/\r?\n/).filter(fila => fila.trim() !== "");
    if (filas.length === 0) return []; 

    const separador = filas[0].includes(";") ? ";" : ",";
    const columnas = filas[0].split(separador).map(c => c.trim().replace(/"/g, ''));

    return filas.slice(1).map(fila => {
        const valores = fila.split(separador);
        let objeto = {};
        columnas.forEach((columna, i) => {
            if (columna) {
                let valor = valores[i] ? valores[i].trim().replace(/"/g, '') : "";
                objeto[columna] = valor;
            }
        });
        return objeto;
    });
}

function normalizarNombre(nombre) {
    if (!nombre) return "";
    let limpio = nombre.trim().toLowerCase();
    limpio = limpio.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return aliasEquipos[limpio] || limpio;
}

function calcularResultadoEsperado(puntosA, puntosB) {
    return 1 / (1 + Math.pow(10, (puntosB - puntosA) / 400));
}

function obtenerMultiplicadorInstancia(torneo, fecha) {
    let clave = `${torneo.trim()}|${fecha}`;
    let cantPartidos = partidosPorFechaYTorneo[clave] || 10;

    if (cantPartidos === 1) return 2.0; 
    if (cantPartidos === 2) return 1.6; 
    if (cantPartidos === 4) return 1.3; 
    if (cantPartidos === 8) return 1.1; 
    return 1.0; 
}

function actualizarPuntos(equipoLocal, equipoVisitante, golesLocal, golesVisitante, torneo, fecha) {
    let puntosL = equipoLocal.puntos;
    let puntosV = equipoVisitante.puntos;

    const VENTAJA_LOCAL = 75;
    let ptosLocalVirtual = puntosL + VENTAJA_LOCAL;

    let esperadoLocal = 1 / (1 + Math.pow(10, (puntosV - ptosLocalVirtual) / 400));

    let resultadoLocal;
    if (golesLocal > golesVisitante) { resultadoLocal = 1; }
    else if (golesLocal < golesVisitante) { resultadoLocal = 0; }
    else { resultadoLocal = 0.5; }

    let difGoles = Math.abs(golesLocal - golesVisitante);
    let G = 1;
    
    if (resultadoLocal !== 0.5) { 
        let difPuntos = (resultadoLocal === 1) ? (ptosLocalVirtual - puntosV) : (puntosV - ptosLocalVirtual);
        let denominador = 2 + 0.001 * difPuntos;
        if (denominador <= 0.1) denominador = 0.1;

        G = Math.log(difGoles + 1) * (2 / denominador);
        if (G < 1) G = 1; 
    }

    const K_BASE = 25;
    const pesoInstancia = obtenerMultiplicadorInstancia(torneo, fecha);
    
    let cambio = K_BASE * pesoInstancia * G * (resultadoLocal - esperadoLocal); 

    equipoLocal.puntos += cambio;
    equipoVisitante.puntos -= cambio;
}

function precalcularHistorialCompleto() {
    cacheHistorialGlobal = {};
    let diccionarioEquipos = {};

    let nombresOriginales = {};
    datosPartidos.forEach(p => {
        let loc = obtenerCampo(p, 'Local').trim();
        let vis = obtenerCampo(p, 'Visitante').trim();
        if (loc) nombresOriginales[normalizarNombre(loc)] = loc;
        if (vis) nombresOriginales[normalizarNombre(vis)] = vis;
    });

    for (let t = 0; t < torneosOrdenados.length; t++) {
        let nombreTorneoActual = torneosOrdenados[t];
        let partidosDeEsteTorneo = datosPartidos.filter(p => obtenerCampo(p, 'Torneo').trim() === nombreTorneoActual);
        
        let equiposEsteTorneo = new Set();
        partidosDeEsteTorneo.forEach(p => {
            let loc = obtenerCampo(p, 'Local');
            let vis = obtenerCampo(p, 'Visitante');
            if (loc) equiposEsteTorneo.add(normalizarNombre(loc));
            if (vis) equiposEsteTorneo.add(normalizarNombre(vis));
        });

        let sumaPts = 0, cantEquipos = 0;
        if (t > 0) {
            Object.values(diccionarioEquipos).forEach(eq => {
                if (eq.ultimoTorneo === t - 1) { sumaPts += eq.puntos; cantEquipos++; }
            });
        }
        let promedioLiga = cantEquipos > 0 ? (sumaPts / cantEquipos) : 1500;

        equiposEsteTorneo.forEach(nombreEq => {
            if (!diccionarioEquipos[nombreEq]) {
                let ptsIniciales = (t === 0) ? 1500 : (promedioLiga - 100);
                diccionarioEquipos[nombreEq] = { 
                    nombre: nombresOriginales[nombreEq], 
                    puntos: ptsIniciales, 
                    ultimoTorneo: t 
                };
            } else {
                if (diccionarioEquipos[nombreEq].ultimoTorneo < t - 1) {
                    diccionarioEquipos[nombreEq].puntos = (diccionarioEquipos[nombreEq].puntos * 0.7) + (promedioLiga * 0.3);
                } else if (diccionarioEquipos[nombreEq].ultimoTorneo === t - 1) {
                    diccionarioEquipos[nombreEq].puntos = (diccionarioEquipos[nombreEq].puntos * 0.95) + (1500 * 0.05);
                }
                diccionarioEquipos[nombreEq].ultimoTorneo = t;
            }
        });

        let fechas = [...new Set(partidosDeEsteTorneo.map(p => Number(obtenerCampo(p, 'Fecha_del_Torneo'))))];
        let fechasValidas = fechas.filter(n => !isNaN(n) && n > 0);
        let maxFechas = fechasValidas.length > 0 ? Math.max(...fechasValidas) : 0;

        let activeTeams = Array.from(equiposEsteTorneo);
        let rankingTemp = activeTeams.map(nameNorm => ({
            nameNorm: nameNorm,
            puntos: diccionarioEquipos[nameNorm].puntos
        })).sort((a,b) => b.puntos - a.puntos);
        
        let posMap = {};
        rankingTemp.forEach((item, idx) => { posMap[item.nameNorm] = idx + 1; });

        activeTeams.forEach(nameNorm => {
            if (!cacheHistorialGlobal[nameNorm]) cacheHistorialGlobal[nameNorm] = [];
            cacheHistorialGlobal[nameNorm].push({
                torneo: nombreTorneoActual,
                fecha: 0,
                puntos: diccionarioEquipos[nameNorm].puntos,
                posicion: posMap[nameNorm],
                rival: "",
                resultado: "",
                score: "",
                variacion: 0,
                fechaReal: parsearFechaStr(obtenerCampo(partidosDeEsteTorneo[0], 'Fecha'))
            });
        });

        for (let f = 1; f <= maxFechas; f++) {
            let partidosFecha = partidosDeEsteTorneo.filter(p => Number(obtenerCampo(p, 'Fecha_del_Torneo')) === f);
            
            let puntosPrevios = {};
            activeTeams.forEach(nameNorm => {
                puntosPrevios[nameNorm] = diccionarioEquipos[nameNorm].puntos;
            });

            let matchDetails = {};
            activeTeams.forEach(nameNorm => {
                matchDetails[nameNorm] = { rival: "", resultado: "", score: "", fechaReal: null };
            });

            partidosFecha.forEach(partido => {
                let locName = obtenerCampo(partido, 'Local');
                let visName = obtenerCampo(partido, 'Visitante');
                let nameLocNorm = normalizarNombre(locName);
                let nameVisNorm = normalizarNombre(visName);

                let local = diccionarioEquipos[nameLocNorm];
                let visitante = diccionarioEquipos[nameVisNorm];
                let golesLocal = Number(obtenerCampo(partido, 'Goles_Local'));
                let golesVisitante = Number(obtenerCampo(partido, 'Goles_Visitante'));

                if (local && visitante) {
                    actualizarPuntos(local, visitante, golesLocal, golesVisitante, nombreTorneoActual, f);
                    
                    let resLoc = golesLocal > golesVisitante ? "Ganó" : (golesLocal < golesVisitante ? "Perdió" : "Empató");
                    let resVis = golesVisitante > golesLocal ? "Ganó" : (golesVisitante < golesLocal ? "Perdió" : "Empató");
                    
                    let fReal = parsearFechaStr(obtenerCampo(partido, 'Fecha'));

                    matchDetails[nameLocNorm] = {
                        rival: visitante.nombre,
                        resultado: resLoc,
                        score: `${golesLocal}-${golesVisitante}`,
                        fechaReal: fReal
                    };
                    matchDetails[nameVisNorm] = {
                        rival: local.nombre,
                        resultado: resVis,
                        score: `${golesVisitante}-${golesLocal}`,
                        fechaReal: fReal
                    };
                }
            });

            let rankingF = activeTeams.map(nameNorm => ({
                nameNorm: nameNorm,
                puntos: diccionarioEquipos[nameNorm].puntos
            })).sort((a,b) => b.puntos - a.puntos);

            let posMapF = {};
            rankingF.forEach((item, idx) => { posMapF[item.nameNorm] = idx + 1; });

            activeTeams.forEach(nameNorm => {
                let md = matchDetails[nameNorm];
                let varElo = diccionarioEquipos[nameNorm].puntos - puntosPrevios[nameNorm];
                let fReal = md.fechaReal || cacheHistorialGlobal[nameNorm][cacheHistorialGlobal[nameNorm].length - 1].fechaReal;

                cacheHistorialGlobal[nameNorm].push({
                    torneo: nombreTorneoActual,
                    fecha: f,
                    puntos: diccionarioEquipos[nameNorm].puntos,
                    posicion: posMapF[nameNorm],
                    rival: md.rival,
                    resultado: md.resultado,
                    score: md.score,
                    variacion: varElo,
                    fechaReal: fReal
                });
            });
        }
    }
}

function calcularRankingHasta(torneoObjetivo, fechaObjetivo) {
    let rankingActual = [];
    
    for (let nameNorm in cacheHistorialGlobal) {
        let hist = cacheHistorialGlobal[nameNorm];
        let snapshot = hist.find(h => h.torneo === torneoObjetivo && h.fecha === fechaObjetivo);
        if (snapshot) {
            rankingActual.push({
                nombre: snapshot.rival ? nameNorm : snapshot.rival || nameNorm, 
                nombreReal: nameNorm,
                puntos: snapshot.puntos,
                posicion: snapshot.posicion
            });
        }
    }

    let nombresOriginales = {};
    datosPartidos.forEach(p => {
        nombresOriginales[normalizarNombre(obtenerCampo(p, 'Local'))] = obtenerCampo(p, 'Local').trim();
    });

    rankingActual.forEach(eq => {
        eq.nombre = nombresOriginales[eq.nombreReal] || eq.nombreReal;
    });

    rankingActual.sort((a, b) => b.puntos - a.puntos);
    rankingActual.forEach((eq, index) => eq.posicion = index + 1);

    return rankingActual;
}

function renderizarTabla(torneoSeleccionado, fechaSeleccionada) {
    const tabla = document.querySelector("#tablaRanking tbody");
    if (!tabla) return;
    tabla.innerHTML = "";

    let rankingActual = calcularRankingHasta(torneoSeleccionado, fechaSeleccionada);
    let rankingAnterior = calcularRankingHasta(torneoSeleccionado, fechaSeleccionada - 1);
    
    let mapaAnterior = {};
    rankingAnterior.forEach(eq => {
        mapaAnterior[eq.nombre] = { posicion: eq.posicion, puntos: eq.puntos };
    });

    rankingActual.forEach((equipo) => {
        let datosAyer = mapaAnterior[equipo.nombre];
        
        let difPosicion = datosAyer ? datosAyer.posicion - equipo.posicion : 0; 
        let difPuntos = datosAyer ? equipo.puntos - datosAyer.puntos : 0;

        let iconoPos = `<span class="igual">-</span>`;
        if (difPosicion > 0) iconoPos = `<span class="sube">▲ ${difPosicion}</span>`;
        if (difPosicion < 0) iconoPos = `<span class="baja">▼ ${Math.abs(difPosicion)}</span>`;
        if (fechaSeleccionada === 0 || !datosAyer) iconoPos = `<span class="igual">-</span>`;

        let textoPts = `<span class="igual">0.00</span>`;
        if (difPuntos > 0.01) textoPts = `<span class="sube">+${difPuntos.toFixed(2)}</span>`;
        else if (difPuntos < -0.01) textoPts = `<span class="baja">${difPuntos.toFixed(2)}</span>`;
        if (fechaSeleccionada === 0 || !datosAyer) textoPts = `<span class="igual">-</span>`;

        let tagAscenso = (!datosAyer && fechaSeleccionada === 0) ? `<span style="font-size:10px; background:#ffd700; padding:2px 5px; border-radius:3px; margin-left:5px; color:black;">NUEVO</span>` : "";

        let escudoHtml = `<img src="${obtenerURL_Escudo(normalizarNombre(equipo.nombre), equipo.nombre)}" style="width:24px; height:24px; object-fit:contain;" alt="logo">`;

        tabla.innerHTML += `
        <tr>
            <td><strong>${equipo.posicion}</strong></td>
            <td>${iconoPos}</td>
            <td class="equipo-nombre" onclick="abrirFichaClub('${equipo.nombre}')">
                <div style="display:flex; align-items:center; gap:10px;">
                    ${escudoHtml}
                    <span>${equipo.nombre} ${tagAscenso}</span>
                </div>
            </td>
            <td class="puntos-totales">${Math.round(equipo.puntos)}</td>
            <td>${textoPts}</td>
        </tr>
        `;
    });
}

function abrirFichaClub(nombreClub) {
    clubSeleccionadoActivo = nombreClub;
    const norm = normalizarNombre(nombreClub);
    const historialCompleto = cacheHistorialGlobal[norm];

    if (!historialCompleto || historialCompleto.length === 0) return;

    const modal = document.getElementById("modalGrafico");
    modal.style.display = "flex";

    let escudoUrl = obtenerURL_Escudo(norm, nombreClub);
    document.getElementById("tituloModal").innerHTML = `
        <div style="display:flex; align-items:center; gap:12px;">
            <img src="${escudoUrl}" style="width:36px; height:36px; object-fit:contain;">
            <span>${nombreClub}</span>
        </div>`;

    const torneoSelect = document.getElementById("selectorTorneo").value;
    const fechaSelect = Number(document.getElementById("selectorFecha").value);
    const limTorneoIdx = torneosOrdenados.indexOf(torneoSelect);

    const histFiltrado = historialCompleto.filter(h => {
        let tIdx = torneosOrdenados.indexOf(h.torneo);
        if (tIdx < limTorneoIdx) return true;
        if (tIdx === limTorneoIdx && h.fecha <= fechaSelect) return true;
        return false;
    });

    let snapActual = histFiltrado[histFiltrado.length - 1];
    let snapAnterior = histFiltrado.length > 1 ? histFiltrado[histFiltrado.length - 2] : null;

    document.getElementById("statPosicion").innerText = `${snapActual.posicion}°`;
    document.getElementById("statElo").innerText = Math.round(snapActual.puntos);

    if (snapAnterior) {
        let difPos = snapAnterior.posicion - snapActual.posicion;
        let difElo = snapActual.puntos - snapAnterior.puntos;

        let pCambio = document.getElementById("statCambioPos");
        if (difPos > 0) { pCambio.className = "stat-change sube"; pCambio.innerText = `▲ +${difPos}`; }
        else if (difPos < 0) { pCambio.className = "stat-change baja"; pCambio.innerText = `▼ ${difPos}`; }
        else { pCambio.className = "stat-change igual"; pCambio.innerText = `-`; }

        let eCambio = document.getElementById("statCambioElo");
        if (difElo > 0) { eCambio.className = "stat-change sube"; eCambio.innerText = `▲ +${difElo.toFixed(1)}`; }
        else if (difElo < 0) { eCambio.className = "stat-change baja"; eCambio.innerText = `▼ ${Math.abs(difElo).toFixed(1)}`; }
        else { eCambio.className = "stat-change igual"; eCambio.innerText = `-`; }
    } else {
        document.getElementById("statCambioPos").innerText = "-";
        document.getElementById("statCambioElo").innerText = "-";
    }

    let posicionesList = histFiltrado.map(h => h.posicion);
    let mejorPos = Math.min(...posicionesList);
    let peorPos = Math.max(...posicionesList);
    let torneosDisputados = [...new Set(histFiltrado.map(h => h.torneo))].length;

    let subidas = histFiltrado.map(h => h.variacion).filter(v => v > 0);
    let bajadas = histFiltrado.map(h => h.variacion).filter(v => v < 0);
    let mayorSubida = subidas.length > 0 ? Math.max(...subidas) : 0;
    let mayorBajada = bajadas.length > 0 ? Math.min(...bajadas) : 0;

    document.getElementById("statMejorPos").innerText = `${mejorPos}°`;
    document.getElementById("statPeorPos").innerText = `${peorPos}°`;
    document.getElementById("statTorneos").innerText = torneosDisputados;
    document.getElementById("statMayorSubida").innerText = `+${mayorSubida.toFixed(1)}`;
    document.getElementById("statMayorBajada").innerText = `${mayorBajada.toFixed(1)}`;

    let tagEstado = document.getElementById("tagEstadoClub");
    let juegaHoy = snapActual.torneo === torneoSelect;
    if (juegaHoy) {
        tagEstado.innerText = "Primera División";
        tagEstado.style.background = "rgba(0, 40, 94, 0.08)";
        tagEstado.style.color = "var(--primary)";
    } else {
        tagEstado.innerText = "En el Ascenso / Inactivo";
        tagEstado.style.background = "rgba(113, 128, 150, 0.15)";
        tagEstado.style.color = "var(--text-muted)";
    }

    actualizarVisualizacionGrafico();
}

function actualizarVisualizacionGrafico() {
    const norm = normalizarNombre(clubSeleccionadoActivo);
    const historialCompleto = cacheHistorialGlobal[norm];

    const torneoSelect = document.getElementById("selectorTorneo").value;
    const fechaSelect = Number(document.getElementById("selectorFecha").value);
    const limTorneoIdx = torneosOrdenados.indexOf(torneoSelect);

    let datosFiltrados = historialCompleto.filter(h => {
        let tIdx = torneosOrdenados.indexOf(h.torneo);
        if (tIdx < limTorneoIdx) return true;
        if (tIdx === limTorneoIdx && h.fecha <= fechaSelect) return true;
        return false;
    });

    let fechaLimiteReal = datosFiltrados[datosFiltrados.length - 1].fechaReal;

    if (filtroTipoActivo === "torneo") {
        if (filtroValorActivo === "ultimo") {
            datosFiltrados = datosFiltrados.filter(h => h.torneo === torneoSelect);
        } else if (filtroValorActivo === "2") {
            let inicioIdx = Math.max(0, limTorneoIdx - 1);
            datosFiltrados = datosFiltrados.filter(h => {
                let idx = torneosOrdenados.indexOf(h.torneo);
                return idx >= inicioIdx && idx <= limTorneoIdx;
            });
        } else if (filtroValorActivo === "5") {
            let inicioIdx = Math.max(0, limTorneoIdx - 4);
            datosFiltrados = datosFiltrados.filter(h => {
                let idx = torneosOrdenados.indexOf(h.torneo);
                return idx >= inicioIdx && idx <= limTorneoIdx;
            });
        }
    } else {
        let msLimite = fechaLimiteReal.getTime();
        let msFiltro = 0;

        if (filtroValorActivo === "1año") msFiltro = 365 * 24 * 60 * 60 * 1000;
        else if (filtroValorActivo === "2años") msFiltro = 2 * 365 * 24 * 60 * 60 * 1000;
        else if (filtroValorActivo === "5años") msFiltro = 5 * 365 * 24 * 60 * 60 * 1000;

        if (msFiltro > 0) {
            datosFiltrados = datosFiltrados.filter(h => (msLimite - h.fechaReal.getTime()) <= msFiltro);
        }

        if (filtroValorActivo !== "1año") {
            datosFiltrados = datosFiltrados.filter((h, idx) => {
                let partidosDelTorneo = datosPartidos.filter(p => obtenerCampo(p, 'Torneo').trim() === h.torneo);
                let fechas = [...new Set(partidosDelTorneo.map(p => Number(obtenerCampo(p, 'Fecha_del_Torneo'))))];
                let maxF = fechas.filter(n => !isNaN(n) && n > 0).length > 0 ? Math.max(...fechas.filter(n => !isNaN(n) && n > 0)) : 0;

                return h.fecha === maxF || h.fecha === 0 || idx === datosFiltrados.length - 1;
            });
        }
    }

    let etiquetasX = datosFiltrados.map(h => {
        let torneoCorto = h.torneo
            .replace("Torneo Inicial", "Inicial")
            .replace("Torneo Final", "Final")
            .replace("Torneo de Transicion", "Transición")
            .replace("Torneo de Transición", "Transición")
            .replace("Temporada", "Temp.")
            .replace("Campeonato de Primera Division", "Camp.")
            .replace("Campeonato de Primera División", "Camp.");
        return h.fecha === 0 ? `${torneoCorto} (Inicio)` : `${torneoCorto} (F${h.fecha})`;
    });

    let datasetY = datosFiltrados.map(h => {
        return {
            x: etiquetasX[datosFiltrados.indexOf(h)],
            y: modoMetricaActivo === "posicion" ? h.posicion : Math.round(h.puntos),
            torneo: h.torneo,
            fecha: h.fecha,
            posicion: h.posicion,
            elo: Math.round(h.puntos),
            rival: h.rival,
            resultado: h.resultado,
            score: h.score,
            variacion: h.variacion
        };
    });

    if (miGrafico) {
        miGrafico.destroy();
    }

    let ctx = document.getElementById("canvasGrafico").getContext("2d");
    miGrafico = new Chart(ctx, {
        type: "line",
        data: {
            labels: etiquetasX,
            datasets: [{
                label: modoMetricaActivo === "posicion" ? "Posición en la Tabla" : "Puntos de Rendimiento Elo",
                data: datasetY,
                borderColor: "#00285e",
                backgroundColor: "rgba(0, 40, 94, 0.05)",
                borderWidth: 3,
                pointRadius: datasetY.length > 50 ? 2 : 4,
                pointHoverRadius: 7,
                pointBackgroundColor: "#00285e",
                tension: 0.15,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    reverse: modoMetricaActivo === "posicion", 
                    min: modoMetricaActivo === "posicion" ? 1 : undefined,
                    ticks: {
                        precision: 0
                    },
                    grid: {
                        color: "#edf2f7"
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        font: { size: 10 }
                    }
                }
            },
            plugins: {
                tooltip: {
                    backgroundColor: "rgba(0, 20, 50, 0.9)",
                    titleFont: { size: 13, weight: "bold" },
                    bodyFont: { size: 12 },
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        title: function(context) {
                            let d = context[0].raw;
                            return `${d.torneo} - Fecha ${d.fecha}`;
                        },
                        label: function(context) {
                            let d = context.raw;
                            let lines = [];
                            lines.push(`Posición: ${d.posicion}°`);
                            lines.push(`Puntos Elo: ${d.elo}`);
                            
                            if (d.rival) {
                                lines.push(`Rival: ${d.rival}`);
                                lines.push(`Resultado: ${d.resultado} (${d.score})`);
                            }
                            
                            if (d.fecha > 0) {
                                let signo = d.variacion >= 0 ? "+" : "";
                                lines.push(`Variación: ${signo}${d.variacion.toFixed(2)} pts`);
                            }
                            return lines;
                        }
                    }
                }
            }
        }
    });
}

function cambiarFiltro(tipo, valor, elemento) {
    filtroTipoActivo = tipo;
    filtroValorActivo = valor;

    document.querySelectorAll("#grupoFiltrosTorneo .btn-pill").forEach(b => b.classList.remove("active"));
    document.querySelectorAll("#grupoFiltrosTiempo .btn-pill").forEach(b => b.classList.remove("active"));
    elemento.classList.add("active");

    actualizarVisualizacionGrafico();
}

function cambiarModoGrafico(modo) {
    modoMetricaActivo = modo;
    
    document.getElementById("segmentPosicion").classList.remove("active");
    document.getElementById("segmentElo").classList.remove("active");

    if (modo === "posicion") {
        document.getElementById("segmentPosicion").classList.add("active");
    } else {
        document.getElementById("segmentElo").classList.add("active");
    }

    actualizarVisualizacionGrafico();
}

function registrarEventosModal() {
    document.querySelectorAll("#grupoFiltrosTorneo .btn-pill").forEach(btn => {
        btn.addEventListener("click", () => cambiarFiltro("torneo", btn.getAttribute("data-valor"), btn));
    });

    document.querySelectorAll("#grupoFiltrosTiempo .btn-pill").forEach(btn => {
        btn.addEventListener("click", () => cambiarFiltro("tiempo", btn.getAttribute("data-valor"), btn));
    });

    document.getElementById("segmentPosicion").addEventListener("click", () => cambiarModoGrafico("posicion"));
    document.getElementById("segmentElo").addEventListener("click", () => cambiarModoGrafico("elo"));

    const modal = document.getElementById("modalGrafico");
    const btnCerrar = document.getElementById("btnCerrarModal");

    if (btnCerrar && modal) {
        btnCerrar.onclick = () => { modal.style.display = "none"; };
        window.onclick = (e) => { if (e.target === modal) modal.style.display = "none"; };
    }
}

// AQUÍ ESTÁ LA MODIFICACIÓN PARA INVERTIR LAS FECHAS
function actualizarDesplegableFechas(torneoSeleccionado) {
    const selectorFecha = document.getElementById("selectorFecha");
    if (!selectorFecha) return;
    selectorFecha.innerHTML = ""; 
    
    let totalFechas = fechasPorTorneo[torneoSeleccionado] || 0;
    
    // Bucle invertido: Empezamos desde la última fecha hasta la 1
    for(let i = totalFechas; i >= 1; i--) {
        let option = document.createElement("option");
        option.value = i;
        option.text = `Fecha ${i}`;
        selectorFecha.appendChild(option);
    }
    
    // Dejamos "Inicio del Torneo" al final de la lista visual
    let optionCero = document.createElement("option");
    optionCero.value = 0;
    optionCero.text = "Inicio del Torneo";
    selectorFecha.appendChild(optionCero);

    // Seleccionamos por defecto la última fecha que se jugó
    selectorFecha.value = totalFechas;
}

async function iniciarApp() {
    try {
        datosPartidos = await leerCSV("partidos.csv");

        torneosOrdenados = [...new Set(datosPartidos.map(p => {
            let t = obtenerCampo(p, 'Torneo');
            return (t || "").trim();
        }).filter(t => t !== ""))];
        
        if (torneosOrdenados.length === 0) throw new Error("No se encontraron torneos en el CSV.");

        partidosPorFechaYTorneo = {};
        datosPartidos.forEach(p => {
            let t = obtenerCampo(p, 'Torneo').trim();
            let f = Number(obtenerCampo(p, 'Fecha_del_Torneo'));
            if (t && !isNaN(f)) {
                let clave = `${t}|${f}`;
                partidosPorFechaYTorneo[clave] = (partidosPorFechaYTorneo[clave] || 0) + 1;
            }
        });

        torneosOrdenados.forEach(torneo => {
            let partidosDeEsteTorneo = datosPartidos.filter(p => obtenerCampo(p, 'Torneo').trim() === torneo);
            let fechas = [...new Set(partidosDeEsteTorneo.map(p => Number(obtenerCampo(p, 'Fecha_del_Torneo'))))];
            let fechasValidas = fechas.filter(n => !isNaN(n) && n > 0);
            fechasPorTorneo[torneo] = fechasValidas.length > 0 ? Math.max(...fechasValidas) : 0;
        });

        precalcularHistorialCompleto();

        const selectorTorneo = document.getElementById("selectorTorneo");
        if (selectorTorneo) {
            selectorTorneo.innerHTML = "";
            [...torneosOrdenados].reverse().forEach(torneo => {
                let option = document.createElement("option");
                option.value = torneo;
                option.text = torneo;
                selectorTorneo.appendChild(option);
            });
        }

        const selectorFecha = document.getElementById("selectorFecha");

        if (selectorTorneo && selectorFecha) {
            selectorTorneo.addEventListener("change", (e) => {
                let torneoSeleccionado = e.target.value;
                actualizarDesplegableFechas(torneoSeleccionado);
                renderizarTabla(torneoSeleccionado, Number(selectorFecha.value));
            });

            selectorFecha.addEventListener("change", (e) => {
                renderizarTabla(selectorTorneo.value, Number(e.target.value));
            });
        }

        const nota = document.createElement("div");
        nota.innerHTML = "<p style='font-size:12px; color:#666; text-align:center; margin-top:20px; font-style:italic;'>Metodología: Sistema Elo Internacional (K=25 variable). Incluye ventaja de localía, multiplicador por diferencia de gol, importancia de playoffs y regresión a la media.</p>";
        const contenedor = document.querySelector(".contenedor");
        if (contenedor) {
            contenedor.appendChild(nota);
        }

        registrarEventosModal();

        let torneoInicial = torneosOrdenados[torneosOrdenados.length - 1];
        if (selectorTorneo && selectorFecha) {
            selectorTorneo.value = torneoInicial;
            actualizarDesplegableFechas(torneoInicial);
            renderizarTabla(torneoInicial, Number(selectorFecha.value));
        }

    } catch (error) {
        console.error(error);
        document.body.innerHTML += `
            <div style="color: red; padding: 15px; border: 1px solid red; margin: 20px;">
                <strong>Falla crítica:</strong> ${error.message}
            </div>
        `;
    }
}

iniciarApp();
