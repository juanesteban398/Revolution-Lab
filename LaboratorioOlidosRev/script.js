// =====================================================
// REVOLUTION LAB - SOLIDOS DE REVOLUCION POR ARANDELAS
// =====================================================

const $ = (id) => document.getElementById(id);
// =====================================
// PANTALLA DE INICIO
// =====================================

$("btnIniciarPrograma").addEventListener("click", () => {

    $("pantallaInicio").style.display = "none";

    actualizarSimulador();

});

const entradaExterior = $("funcionExterior");
const entradaInterior = $("funcionInterior");
const entradaA = $("limiteA");
const entradaB = $("limiteB");

const selectorEje = $("ejeRevolucion");
const selectorVariable = $("variableFuncion");

let ultimoResultado = null;

// -----------------------------------------------------
// 1. INTERPRETAR FUNCIONES MATEMATICAS DE FORMA SEGURA
// -----------------------------------------------------

const funcionesPermitidas = new Set([
    "sin", "cos", "tan", "asin", "acos", "atan",
    "sinh", "cosh", "tanh", "sqrt", "abs",
    "exp", "log", "log10", "floor", "ceil", "round"
]);


function compilarFuncion(expresionOriginal, variable = "x") {

    const expresion = expresionOriginal.trim();

    if (!expresion) {
        throw new Error("Debes escribir una función.");
    }

    if (variable !== "x" && variable !== "y") {
        throw new Error("Variable matemática no válida.");
    }

    if (!/^[0-9a-zA-Z_+\-*/^().,\s]+$/.test(expresion)) {
        throw new Error("La función contiene caracteres no permitidos.");
    }

    const arbol = math.parse(expresion);

    arbol.traverse((nodo) => {

        if (nodo.isSymbolNode) {

            const nombre = nodo.name;

            if (
                nombre !== variable &&
                nombre !== "pi" &&
                nombre !== "e" &&
                !funcionesPermitidas.has(nombre)
            ) {
                throw new Error(
                    `Símbolo no permitido: ${nombre}. La variable seleccionada es ${variable}.`
                );
            }
        }

        if (nodo.isFunctionNode) {

            const nombre = nodo.fn && nodo.fn.name;

            if (!funcionesPermitidas.has(nombre)) {
                throw new Error(
                    `Función no permitida: ${nombre || "desconocida"}`
                );
            }
        }

        if (
            nodo.isAssignmentNode ||
            nodo.isAccessorNode ||
            nodo.isBlockNode ||
            nodo.isConditionalNode ||
            nodo.isFunctionAssignmentNode
        ) {
            throw new Error(
                "Ese tipo de expresión no está permitido."
            );
        }

    });

    const codigo = arbol.compile();

    return function (valorVariable) {

        const valor = codigo.evaluate({
            [variable]: valorVariable
        });

        if (
            typeof valor !== "number" ||
            !Number.isFinite(valor)
        ) {
            throw new Error(
                `La función no produce un valor real válido en ${variable} = ${valorVariable.toFixed(4)}.`
            );
        }

        return valor;
    };
}

// -----------------------------------------------------
// 2. INTEGRACION NUMERICA: REGLA COMPUESTA DE SIMPSON
// -----------------------------------------------------

function simpson(funcion, a, b, n = 1000) {
    if (n % 2 !== 0) n++;

    const h = (b - a) / n;
    let suma = funcion(a) + funcion(b);

    for (let i = 1; i < n; i++) {
        const x = a + i * h;
        suma += (i % 2 === 0 ? 2 : 4) * funcion(x);
    }

    return (h / 3) * suma;
}
// =====================================================
// DETECCIÓN DE INTERSECCIONES ENTRE FUNCIONES
// =====================================================

function detectarIntersecciones(f, g, a, b, muestras = 1200) {
    const cruces = [];

    const diferencia = (u) => f(u) - g(u);

    let xAnterior = a;
    let valorAnterior = diferencia(xAnterior);

    for (let i = 1; i <= muestras; i++) {
        const xActual = a + (b - a) * i / muestras;
        const valorActual = diferencia(xActual);

        // Comprobar si existe un cambio de signo
        if (valorAnterior * valorActual < 0) {
            let izquierda = xAnterior;
            let derecha = xActual;

            // Aproximar el cruce mediante bisección
            for (let j = 0; j < 60; j++) {
                const medio = (izquierda + derecha) / 2;
                const valorMedio = diferencia(medio);

                if (
                    diferencia(izquierda) * valorMedio <= 0
                ) {
                    derecha = medio;
                } else {
                    izquierda = medio;
                }
            }

            const cruce = (izquierda + derecha) / 2;

            if (
                cruces.length === 0 ||
                Math.abs(cruce - cruces[cruces.length - 1]) > 1e-6
            ) {
                cruces.push(cruce);
            }
        }

        xAnterior = xActual;
        valorAnterior = valorActual;
    }

    return cruces;
}
function dividirIntervalos(a, b, cruces) {
    const puntos = [a, ...cruces, b];

    const intervalos = [];

    for (let i = 0; i < puntos.length - 1; i++) {
        intervalos.push({
            inicio: puntos[i],
            fin: puntos[i + 1]
        });
    }

    return intervalos;
}
// =====================================================
// DESPEJE NUMÉRICO PARA EJES PERPENDICULARES
// =====================================================

function obtenerIntervalosEnNivel(f, g, a, b, nivel, muestras = 800) {

    const paso = (b - a) / muestras;
    const intervalos = [];

    let inicio = null;

    for (let i = 0; i < muestras; i++) {

        const izquierda = a + i * paso;
        const derecha = izquierda + paso;
        const medio = (izquierda + derecha) / 2;

        const valorF = f(medio);
        const valorG = g(medio);

        const minimo = Math.min(valorF, valorG);
        const maximo = Math.max(valorF, valorG);

        const pertenece = nivel >= minimo && nivel <= maximo;

        if (pertenece && inicio === null) {
            inicio = izquierda;
        }

        if (!pertenece && inicio !== null) {

            intervalos.push({
                inicio,
                fin: izquierda
            });

            inicio = null;
        }
    }

    if (inicio !== null) {
        intervalos.push({
            inicio,
            fin: b
        });
    }

    return intervalos;
}


// Calcular el área de una sección perpendicular al eje.

function calcularAreaNivel(f, g, a, b, nivel) {

    const intervalos = obtenerIntervalosEnNivel(
        f,
        g,
        a,
        b,
        nivel
    );

    let area = 0;

    for (const intervalo of intervalos) {

        const radioInterior = intervalo.inicio;
        const radioExterior = intervalo.fin;

        area += Math.PI * (
            radioExterior ** 2 - radioInterior ** 2
        );
    }

    return area;
}


// Obtener los límites de integración de la coordenada del eje.

function obtenerLimitesPerpendiculares(f, g, a, b, muestras = 1000) {

    let minimo = Infinity;
    let maximo = -Infinity;

    for (let i = 0; i <= muestras; i++) {

        const u = a + (b - a) * i / muestras;

        const valorF = f(u);
        const valorG = g(u);

        minimo = Math.min(minimo, valorF, valorG);
        maximo = Math.max(maximo, valorF, valorG);
    }

    return { minimo, maximo };
}
// -----------------------------------------------------
// 3. LEER Y VALIDAR EL MODELO
// -----------------------------------------------------

function obtenerModelo() {

    const variable = selectorVariable.value;
    const eje = selectorEje.value;

    const f = compilarFuncion(entradaExterior.value, variable);
    const g = compilarFuncion(entradaInterior.value, variable);

    const a = Number(entradaA.value);
    const b = Number(entradaB.value);

    if (!Number.isFinite(a) || !Number.isFinite(b) || a >= b) {
        throw new Error("El límite inferior debe ser menor que el superior.");
    }

    // Detectar intersecciones entre las funciones.

    const muestras = 1200;

    const cruces = detectarIntersecciones(
        f,
        g,
        a,
        b,
        muestras
    );

    const intervalos = dividirIntervalos(a, b, cruces);

    let volumen;
    let radioMaximo;

    // ==========================================
    // CASO 1: VARIABLE Y EJE COINCIDEN
    // ==========================================

    if (variable === eje) {

        const R = (u) => Math.max(f(u), g(u));
        const r = (u) => Math.min(f(u), g(u));

        for (let i = 0; i <= muestras; i++) {

            const u = a + (b - a) * i / muestras;

            if (r(u) < 0) {
                throw new Error(
                    "Las funciones deben estar por encima del eje de revolución."
                );
            }
        }

        let integralTotal = 0;

        for (const intervalo of intervalos) {

            integralTotal += simpson(
                (u) => Math.PI * (
                    R(u) ** 2 - r(u) ** 2
                ),
                intervalo.inicio,
                intervalo.fin
            );
        }

        volumen = integralTotal;

        radioMaximo = 0;

        for (let i = 0; i <= muestras; i++) {

            const u = a + (b - a) * i / muestras;

            radioMaximo = Math.max(
                radioMaximo,
                R(u)
            );
        }

        return {
            f, g, R, r,
            a, b,
            eje,
            variable,
            volumen,
            coeficiente: volumen / Math.PI,
            radioMaximo,
            cruces,
            intervalos,
            perpendicular: false
        };
    }

    // ==========================================
    // CASO 2: VARIABLE Y EJE SON PERPENDICULARES
    // ==========================================

    // La variable independiente representa el radio.
    // Por ahora restringimos el dominio a valores no negativos.

    if (a < 0) {
        throw new Error(
            "Para la revolución perpendicular, el intervalo de la variable debe comenzar en cero o en un valor positivo."
        );
    }

    const limites = obtenerLimitesPerpendiculares(
        f,
        g,
        a,
        b,
        muestras
    );

    const limiteInferior = limites.minimo;
    const limiteSuperior = limites.maximo;

    if (limiteSuperior <= limiteInferior) {
        throw new Error("No se pudo determinar un intervalo válido de integración.");
    }

    // Integrar las áreas de las secciones perpendiculares.

    const integral = simpson(
        (nivel) => calcularAreaNivel(
            f,
            g,
            a,
            b,
            nivel
        ),
        limiteInferior,
        limiteSuperior,
        600
    );

    volumen = integral;

    radioMaximo = b;

    return {
        f,
        g,
        a,
        b,
        eje,
        variable,
        volumen,
        coeficiente: volumen / Math.PI,
        radioMaximo,
        cruces,
        intervalos,
        perpendicular: true,
        limiteInferior,
        limiteSuperior
    };
}
// =====================================
// ACTUALIZAR FORMULA SEGUN EL EJE
// =====================================


function actualizarEje() {

    const eje = selectorEje.value;
    const variable = selectorVariable.value;

    $("descripcionVariable").textContent =
        `Las funciones están expresadas en términos de ${variable}.`;

    $("descripcionEje").textContent =
        `El sólido gira alrededor del eje ${eje.toUpperCase()}.`;

    $("descripcionGrafica").textContent =
        `Representación de f(${variable}) y g(${variable}) en el intervalo seleccionado.`;

    if (eje === "x") {

        $("formulaVolumen").innerHTML =
            "V = π ∫<sub>a</sub><sup>b</sup> [R(x)² − r(x)²] dx";

        $("descripcionFormula").textContent =
            "Integración respecto a x, mediante arandelas perpendiculares al eje X.";

    } else {

        $("formulaVolumen").innerHTML =
            "V = π ∫<sub>a</sub><sup>b</sup> [R(y)² − r(y)²] dy";

        $("descripcionFormula").textContent =
            "Integración respecto a y, mediante arandelas perpendiculares al eje Y.";

    }
}


// -----------------------------------------------------
// 4. GRAFICA 2D CON PLOTLY
// -----------------------------------------------------

function dibujarGrafica(modelo) {

    const { f, g, a, b, variable } = modelo;

    const coordenada = [];
    const radiosExterior = [];
    const radiosInterior = [];

    const cantidad = 250;

    for (let i = 0; i <= cantidad; i++) {

        const u = a + (b - a) * i / cantidad;

        coordenada.push(u);
        radiosExterior.push(f(u));
        radiosInterior.push(g(u));

    }

    let datos;
    let ejeX;
    let ejeY;

    if (variable === "x") {

        ejeX = "x";
        ejeY = "Radio";

        datos = [

            {
                x: coordenada,
                y: radiosExterior,
                type: "scatter",
                mode: "lines",
                name: "Función f",
                line: { color: "#38bdf8", width: 3 }
            },

            {
                x: coordenada,
                y: radiosInterior,
                type: "scatter",
                mode: "lines",
                name: "Función g",
                line: { color: "#f59e0b", width: 3 },
                fill: "tonexty",
                fillcolor: "rgba(59, 130, 246, 0.18)"
            }

        ];

    } else {

        ejeX = "x";
        ejeY = "y";

        datos = [

            {
                x: radiosExterior,
                y: coordenada,
                type: "scatter",
                mode: "lines",
                name: "Radio exterior",
                line: { color: "#38bdf8", width: 3 }
            },

            {
                x: radiosInterior,
                y: coordenada,
                type: "scatter",
                mode: "lines",
                name: "Radio interior",
                line: { color: "#f59e0b", width: 3 },
                fill: "tonextx",
                fillcolor: "rgba(59, 130, 246, 0.18)"
            }

        ];

    }

    const layout = {

        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "#0c1728",

        font: {
            color: "#dbeafe"
        },

        margin: {
            l: 55,
            r: 20,
            t: 20,
            b: 55
        },

        xaxis: {
            title: ejeX,
            gridcolor: "#26364d",
            zerolinecolor: "#64748b"
        },

        yaxis: {
            title: ejeY,
            gridcolor: "#26364d",
            zerolinecolor: "#64748b"
        },

        legend: {
            orientation: "h",
            y: -0.22
        },

        hovermode: "closest"

    };

    Plotly.react(
        "grafico",
        datos,
        layout,
        {
            responsive: true,
            displaylogo: false
        }
    );

}
// -----------------------------------------------------
// 5. ESCENA THREE.JS
// -----------------------------------------------------

const contenedor3D = $("modelo3D");
const escena = new THREE.Scene();
escena.background = new THREE.Color(0x0c1728);

const camara = new THREE.PerspectiveCamera(
    45,
    contenedor3D.clientWidth / contenedor3D.clientHeight,
    0.1,
    5000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(contenedor3D.clientWidth, contenedor3D.clientHeight);
contenedor3D.appendChild(renderer.domElement);

escena.add(new THREE.AmbientLight(0xffffff, 0.75));

const luzPrincipal = new THREE.DirectionalLight(0xffffff, 1.2);
luzPrincipal.position.set(20, 35, 25);
escena.add(luzPrincipal);

const luzRelleno = new THREE.PointLight(0x38bdf8, 0.7);
luzRelleno.position.set(-20, -10, -20);
escena.add(luzRelleno);

const controles = new THREE.OrbitControls(camara, renderer.domElement);
controles.enableDamping = true;
controles.dampingFactor = 0.07;
controles.enableRotate = true;
controles.enableZoom = true;
controles.enablePan = true;

let grupoSolido = null;

function crearSuperficie(
    funcionRadio,
    a,
    b,
    segmentosX,
    segmentosAngulo,
    eje,
    invertir = false
) {

    const vertices = [];
    const indices = [];

    for (let i = 0; i <= segmentosX; i++) {

        const u = a + (b - a) * i / segmentosX;

        const radio = Math.max(0, funcionRadio(u));

        for (let j = 0; j <= segmentosAngulo; j++) {

            const theta = 2 * Math.PI * j / segmentosAngulo;

            const radialX = radio * Math.cos(theta);
            const radialZ = radio * Math.sin(theta);

            if (eje === "x") {

                vertices.push(
                    u,
                    radialX,
                    radialZ
                );

            } else {

                vertices.push(
                    radialX,
                    u,
                    radialZ
                );

            }

        }

    }

    for (let i = 0; i < segmentosX; i++) {

        for (let j = 0; j < segmentosAngulo; j++) {

            const actual =
                i * (segmentosAngulo + 1) + j;

            const siguiente =
                actual + segmentosAngulo + 1;

            if (!invertir) {

                indices.push(
                    actual,
                    siguiente,
                    actual + 1
                );

                indices.push(
                    siguiente,
                    siguiente + 1,
                    actual + 1
                );

            } else {

                indices.push(
                    actual,
                    actual + 1,
                    siguiente
                );

                indices.push(
                    siguiente,
                    actual + 1,
                    siguiente + 1
                );

            }

        }

    }

    const geometria = new THREE.BufferGeometry();

    geometria.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices, 3)
    );

    geometria.setIndex(indices);
    geometria.computeVertexNormals();

    return geometria;

}

function crearTapa(
    u,
    radioExterior,
    radioInterior,
    eje,
    segmentos = 96,
    invertir = false
) {

    const vertices = [];
    const indices = [];

    for (let anillo = 0; anillo < 2; anillo++) {

        const radio =
            anillo === 0 ? radioInterior : radioExterior;

        for (let j = 0; j <= segmentos; j++) {

            const theta = 2 * Math.PI * j / segmentos;

            const radialX = radio * Math.cos(theta);
            const radialZ = radio * Math.sin(theta);

            if (eje === "x") {

                vertices.push(
                    u,
                    radialX,
                    radialZ
                );

            } else {

                vertices.push(
                    radialX,
                    u,
                    radialZ
                );

            }

        }

    }

    for (let j = 0; j < segmentos; j++) {

        const interior1 = j;
        const interior2 = j + 1;

        const exterior1 = segmentos + 1 + j;
        const exterior2 = exterior1 + 1;

        if (!invertir) {

            indices.push(
                interior1,
                exterior1,
                interior2
            );

            indices.push(
                interior2,
                exterior1,
                exterior2
            );

        } else {

            indices.push(
                interior1,
                interior2,
                exterior1
            );

            indices.push(
                interior2,
                exterior2,
                exterior1
            );

        }

    }

    const geometria = new THREE.BufferGeometry();

    geometria.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices, 3)
    );

    geometria.setIndex(indices);
    geometria.computeVertexNormals();

    return geometria;

}

function agregarMalla(grupo, geometria, material) {
    const malla = new THREE.Mesh(geometria, material);
    grupo.add(malla);
}
// =====================================================
// CREAR UNA ARANDELA 3D PARA EJES PERPENDICULARES
// =====================================================

function crearArandela3D(
    radioInterior,
    radioExterior,
    grosor,
    eje,
    material
) {

    if (radioExterior <= radioInterior || grosor <= 0) {
        return null;
    }

    const forma = new THREE.Shape();

    // Contorno exterior
    forma.absarc(
        0, 0,
        radioExterior,
        0,
        Math.PI * 2,
        false
    );

    // Hueco interior, si existe
    if (radioInterior > 1e-6) {

        const agujero = new THREE.Path();

        agujero.absarc(
            0, 0,
            radioInterior,
            0,
            Math.PI * 2,
            true
        );

        forma.holes.push(agujero);
    }

    const geometria = new THREE.ExtrudeGeometry(
        forma,
        {
            depth: grosor,
            bevelEnabled: false,
            curveSegments: 48
        }
    );

    // Centrar el grosor de la arandela
    geometria.translate(0, 0, -grosor / 2);

    // Orientar el eje de la arandela
    if (eje === "y") {
        geometria.rotateX(Math.PI / 2);
    } else {
        geometria.rotateY(Math.PI / 2);
    }

    geometria.computeVertexNormals();

    return new THREE.Mesh(geometria, material);
}
function dibujarModelo3D(modelo) {

    if (grupoSolido) {

        escena.remove(grupoSolido);

        grupoSolido.traverse((objeto) => {

            if (objeto.geometry) {
                objeto.geometry.dispose();
            }

            if (objeto.material) {
                objeto.material.dispose();
            }

        });

    }

    grupoSolido = new THREE.Group();

    const materialExterior = new THREE.MeshStandardMaterial({

        color: 0x38bdf8,
        metalness: 0.22,
        roughness: 0.28,
        side: THREE.DoubleSide

    });

    const materialInterior = new THREE.MeshStandardMaterial({

        color: 0xf59e0b,
        metalness: 0.12,
        roughness: 0.4,
        side: THREE.DoubleSide

    });

    const materialTapa = new THREE.MeshStandardMaterial({

        color: 0x64748b,
        metalness: 0.2,
        roughness: 0.4,
        side: THREE.DoubleSide

    });

    const { R, r, a, b, eje } = modelo;

    const segmentosX = 180;
    const segmentosAngulo = 96;

    // SUPERFICIE EXTERIOR

    agregarMalla(
        grupoSolido,
        crearSuperficie(
            R, a, b,
            segmentosX,
            segmentosAngulo,
            eje,
            false
        ),
        materialExterior
    );

    // SUPERFICIE INTERIOR

const radioInteriorMax = Math.max(
    ...Array.from({ length: 101 }, (_, i) => {
        const u = a + (b - a) * i / 100;
        return r(u);
    })
);

    if (radioInteriorMax > 1e-7) {

        agregarMalla(
            grupoSolido,
            crearSuperficie(
                r, a, b,
                segmentosX,
                segmentosAngulo,
                eje,
                true
            ),
            materialInterior
        );

    }

    // TAPAS

    const radioExtA = R(a);
    const radioIntA = r(a);

    const radioExtB = R(b);
    const radioIntB = r(b);

    if (radioExtA > 1e-7) {

        agregarMalla(
            grupoSolido,
            crearTapa(
                a,
                radioExtA,
                radioIntA,
                eje,
                96,
                true
            ),
            materialTapa
        );

    }

    if (radioExtB > 1e-7) {

        agregarMalla(
            grupoSolido,
            crearTapa(
                b,
                radioExtB,
                radioIntB,
                eje,
                96,
                false
            ),
            materialTapa
        );

    }

    // CENTRAR EL SÓLIDO

    if (eje === "x") {

        grupoSolido.position.x = -(a + b) / 2;

    } else {

        grupoSolido.position.y = -(a + b) / 2;

    }

    escena.add(grupoSolido);

    // AJUSTAR CÁMARA

    const longitud = b - a;

    const escala = Math.max(
        longitud,
        modelo.radioMaximo * 2,
        5
    );

    controles.target.set(0, 0, 0);

    camara.position.set(
        escala * 1.25,
        escala * 1.15,
        escala * 1.55
    );

    camara.near = Math.max(0.01, escala / 1000);
    camara.far = escala * 100;

    camara.updateProjectionMatrix();

    controles.minDistance = escala * 0.15;
    controles.maxDistance = escala * 12;

    controles.update();

    $("mensaje3D").style.display = "none";

}
// =====================================================
// MODELO 3D PARA EJES PERPENDICULARES
// =====================================================

function dibujarModelo3DPerpendicular(modelo) {

    // Eliminar el sólido anterior
    if (grupoSolido) {

        escena.remove(grupoSolido);

        grupoSolido.traverse((objeto) => {

            if (objeto.geometry) {
                objeto.geometry.dispose();
            }

            if (objeto.material) {
                objeto.material.dispose();
            }

        });
    }

    grupoSolido = new THREE.Group();

    const materialArandela = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        metalness: 0.25,
        roughness: 0.3,
        side: THREE.DoubleSide
    });

    const { f, g, a, b, eje } = modelo;

    // El eje de revolución es perpendicular
    // a la variable de las funciones.

    const limites = obtenerLimitesPerpendiculares(
        f,
        g,
        a,
        b,
        1000
    );

    const nivelMinimo = limites.minimo;
    const nivelMaximo = limites.maximo;

    // Cantidad de secciones tridimensionales
    const cantidadSecciones = 240;

    const grosor = (
        nivelMaximo - nivelMinimo
    ) / cantidadSecciones;

    // Construir las arandelas a lo largo del eje.
    for (let i = 0; i < cantidadSecciones; i++) {

        const nivel = nivelMinimo + (i + 0.5) * grosor;

        const intervalos = obtenerIntervalosEnNivel(
            f,
            g,
            a,
            b,
            nivel,
            800
        );

        // Puede haber varias regiones en una misma sección.
        for (const intervalo of intervalos) {

            const radioInterior = Math.max(0, intervalo.inicio);
            const radioExterior = Math.max(0, intervalo.fin);

            if (radioExterior - radioInterior < 1e-5) {
                continue;
            }

            const arandela = crearArandela3D(
                radioInterior,
                radioExterior,
                grosor,
                eje,
                materialArandela
            );

            if (arandela) {

                // Ubicar cada sección sobre el eje correspondiente.
                if (eje === "y") {

                    arandela.position.y = nivel;

                } else {

                    arandela.position.x = nivel;

                }

                grupoSolido.add(arandela);
            }
        }
    }

    escena.add(grupoSolido);

    // Ajustar cámara y controles
    const longitudEje = nivelMaximo - nivelMinimo;

    const escala = Math.max(
        longitudEje,
        modelo.radioMaximo * 2,
        5
    );

    controles.target.set(0, 0, 0);

    camara.position.set(
        escala * 1.4,
        escala * 1.3,
        escala * 1.7
    );

    camara.near = Math.max(0.01, escala / 1000);
    camara.far = escala * 100;

    camara.updateProjectionMatrix();

    controles.minDistance = escala * 0.15;
    controles.maxDistance = escala * 12;

    controles.update();

    $("mensaje3D").style.display = "none";
}

// -----------------------------------------------------
// 6. ACTUALIZAR CALCULO Y VISUALIZACIONES
// -----------------------------------------------------

function mostrarError(mensaje) {

    $("mensajeEstado").textContent = mensaje;
    $("mensajeEstado").className = "mensaje error";

    $("estadoSistema").textContent = "● Error en el modelo";
    $("estadoSistema").style.color = "#fca5a5";

    ultimoResultado = null;

    $("coeficiente").textContent = "—";
    $("volumen").textContent = "—";
    $("intervalo").textContent = "—";

}

function actualizarSimulador() {

    try {

        actualizarEje();

        const modelo = obtenerModelo();

        // MOSTRAR INTERSECCIONES DETECTADAS

const advertencia = $("advertenciaCruces");
const textoCruces = $("textoCruces");

if (modelo.cruces.length > 0) {

    advertencia.style.display = "block";

    const listaCruces = modelo.cruces
        .map((cruce) =>
            `${modelo.variable} = ${cruce.toFixed(4)}`
        )
        .join(", ");

    textoCruces.textContent =
        `Se detectaron ${modelo.cruces.length} intersecciones: ${listaCruces}. ` +
        `El intervalo se dividió en ${modelo.intervalos.length} partes.`;

} else {

    advertencia.style.display = "none";
}

        $("coeficiente").textContent =
            `${modelo.coeficiente.toFixed(6)}π`;

        $("volumen").textContent =
            `${modelo.volumen.toFixed(6)} unidades³`;

        $("intervalo").textContent =
            `[${modelo.a}, ${modelo.b}]`;

dibujarGrafica(modelo);

if (modelo.perpendicular) {

    dibujarModelo3DPerpendicular(modelo);

} else {

    dibujarModelo3D(modelo);

}

        ultimoResultado = modelo;

        $("mensajeEstado").textContent =
            "Modelo generado correctamente. Puedes rotar el sólido 3D.";

        $("mensajeEstado").className = "mensaje exito";

        $("estadoSistema").textContent =
            "● Modelo actualizado";

        $("estadoSistema").style.color = "#4ade80";

    } catch (error) {

        mostrarError(error.message);

    }

}

// -----------------------------------------------------
// 7. EJEMPLOS PRECONFIGURADOS
// -----------------------------------------------------

document.querySelectorAll(".ejemplo").forEach((boton) => {
    boton.addEventListener("click", () => {
        entradaExterior.value = boton.dataset.f;
        entradaInterior.value = boton.dataset.g;
        entradaA.value = boton.dataset.a;
        entradaB.value = boton.dataset.b;
        actualizarSimulador();
    });
});

$("btnActualizar").addEventListener(
    "click",
    actualizarSimulador
);

selectorEje.addEventListener(
    "change",
    actualizarSimulador
);

selectorVariable.addEventListener(
    "change",
    actualizarSimulador
);

// Permitir actualizar con Enter desde los campos de funciones.
[entradaExterior, entradaInterior, entradaA, entradaB].forEach((campo) => {
    campo.addEventListener("keydown", (evento) => {
        if (evento.key === "Enter") actualizarSimulador();
    });
});

// -----------------------------------------------------
// 8. REDIMENSIONAMIENTO Y ANIMACION
// -----------------------------------------------------

function ajustarTamano() {
    const ancho = contenedor3D.clientWidth;
    const alto = contenedor3D.clientHeight;

    if (ancho <= 0 || alto <= 0) return;

    camara.aspect = ancho / alto;
    camara.updateProjectionMatrix();
    renderer.setSize(ancho, alto);
}

const observador = new ResizeObserver(ajustarTamano);
observador.observe(contenedor3D);

function animar() {
    requestAnimationFrame(animar);
    controles.update();
    renderer.render(escena, camara);
}

// -----------------------------------------------------
// 9. INICIO
// -----------------------------------------------------

actualizarSimulador();
animar();
