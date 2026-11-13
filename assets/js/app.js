document.addEventListener('DOMContentLoaded', () => {
    // Referencias a los elementos del DOM
    const testSelector = document.getElementById('testSelector');
    const examPanel = document.getElementById('examPanel');
    const resultPanel = document.getElementById('resultPanel');
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('errorMessage');

    const examTitle = document.getElementById('examTitle');
    const examDescription = document.getElementById('examDescription');
    const currentQuestionEl = document.getElementById('currentQuestion');
    const totalQuestionsEl = document.getElementById('totalQuestions');
    const progressPercentage = document.getElementById('progressPercentage');
    const progressFill = document.getElementById('progressFill');

    const questionNumberEl = document.getElementById('questionNumber');
    const questionTextEl = document.getElementById('questionText');
    const questionTranslationEl = document.getElementById('questionTranslation');
    const optionsList = document.getElementById('optionsList');

    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');
    const finishButton = document.getElementById('finishButton');
    const answeredInfo = document.getElementById('answeredInfo');

    const scorePercentage = document.getElementById('scorePercentage');
    const correctAnswersEl = document.getElementById('correctAnswers');
    const incorrectAnswersEl = document.getElementById('incorrectAnswers');
    const unansweredAnswersEl = document.getElementById('unansweredAnswers');
    const resultMessage = document.getElementById('resultMessage');

    const reviewButton = document.getElementById('reviewButton');
    const restartButton = document.getElementById('restartButton');

    // Estado de la aplicación
    let currentExamData = null;
    let currentQuestionIndex = 0;
    let userAnswers = {}; // Almacena la opción seleccionada por índice de pregunta: { 0: optionId, 1: optionId, ... }
    let isReviewMode = false;

    // 1. Cargar el índice de exámenes al iniciar
    loadExamIndex();

    async function loadExamIndex() {
        showLoading(true);
        hideError();
        try {
            const response = await fetch('./blob/ac71cf0215840a4af18eb270902ee798958544f3/data/test.json'); // Ajusta la ruta si es necesario
            if (!response.ok) throw new Error('No se pudo cargar el listado de exámenes.');
            const data = await response.json();
            
            populateTestSelector(data.tests);
        } catch (error) {
            showError('Error al cargar los exámenes disponibles: ' + error.message);
            testSelector.innerHTML = '<option value="">Error al cargar</option>';
        } finally {
            showLoading(false);
        }
    }

    function populateTestSelector(tests) {
        testSelector.innerHTML = '<option value="">-- Selecciona un examen --</option>';
        tests.forEach(test => {
            const option = document.createElement('option');
            option.value = test.archivo;
            option.textContent = test.nombre;
            testSelector.appendChild(option);
        });
    }

    // Evento de selección de examen
    testSelector.addEventListener('change', async (e) => {
        const selectedFile = e.target.value;
        if (!selectedFile) return;

        await loadExamContent(selectedFile);
    });

    async function loadExamContent(fileName) {
        showLoading(true);
        hideError();
        try {
            // Se asume que los JSON de los test están en una carpeta ./tests/ o en la misma ruta
            const response = await fetch(`../../data/${fileName}`);
            if (!response.ok) throw new Error('No se pudo cargar el archivo del examen.');
            
            currentExamData = await response.json();
            initExam();
        } catch (error) {
            showError('Error al cargar el contenido del test: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    function initExam() {
        currentQuestionIndex = 0;
        userAnswers = {};
        isReviewMode = false;

        examTitle.textContent = currentExamData.titulo;
        examDescription.textContent = currentExamData.descripcion;
        totalQuestionsEl.textContent = currentExamData.preguntas.length;

        document.querySelector('.exam-selector').hidden = true;
        resultPanel.hidden = true;
        examPanel.hidden = false;
        finishButton.hidden = true;
        nextButton.hidden = false;

        renderQuestion();
    }

    function renderQuestion() {
        const questionData = currentExamData.preguntas[currentQuestionIndex];
        
        currentQuestionIndexEl = currentQuestionIndex + 1;
        currentQuestionEl.textContent = currentQuestionIndexEl;
        questionNumberEl.textContent = String(currentQuestionIndexEl).padStart(2, '0');
        questionTextEl.textContent = questionData.pregunta;
        
        if (questionData.traduccion) {
            questionTranslationEl.textContent = questionData.traduccion;
            questionTranslationEl.hidden = false;
        } else {
            questionTranslationEl.hidden = true;
        }

        // Renderizar opciones
        optionsList.innerHTML = '';
        questionData.opciones.forEach(option => {
            const label = document.createElement('label');
            label.className = 'option-card'; // Asumiendo clases estándar o personalizadas

            const input = document.createElement('input');
            input.type = 'radio';
            input.name = `question_${currentQuestionIndex}`;
            input.value = option.id;
            
            // Verificar si ya fue respondida previamente
            if (userAnswers[currentQuestionIndex] === option.id) {
                input.checked = true;
            }

            // Si estamos en modo revisión, deshabilitar y mostrar colores de corrección
            if (isReviewMode) {
                input.disabled = true;
                if (option.correcta) {
                    label.classList.add('correct-option');
                } else if (userAnswers[currentQuestionIndex] === option.id && !option.correcta) {
                    label.classList.add('incorrect-option');
                }
            }

            input.addEventListener('change', () => {
                if (!isReviewMode) {
                    userAnswers[currentQuestionIndex] = option.id;
                    updateProgress();
                }
            });

            const contentDiv = document.createElement('div');
            contentDiv.className = 'option-content';
            
            const textStrong = document.createElement('strong');
            textStrong.textContent = option.enunciado;
            contentDiv.appendChild(textStrong);

            if (option.traduccion) {
                const subP = document.createElement('p');
                subP.textContent = option.traduccion;
                contentDiv.appendChild(subP);
            }

            label.appendChild(input);
            label.appendChild(contentDiv);
            optionsList.appendChild(label);
        });

        // Actualizar botones de navegación
        prevButton.disabled = currentQuestionIndex === 0;
        
        if (currentQuestionIndex === currentExamData.preguntas.length - 1) {
            nextButton.hidden = true;
            finishButton.hidden = isReviewMode; // Si estamos revisando, ocultamos finalizar
        } else {
            nextButton.hidden = false;
            finishButton.hidden = true;
        }

        updateProgress();
    }

    function updateProgress() {
        const total = currentExamData.preguntas.length;
        const answeredCount = Object.keys(userAnswers).length;
        const percentage = Math.round((answeredCount / total) * 100);

        progressPercentage.textContent = `${percentage}%`;
        progressFill.style.width = `${percentage}%`;
        progressTrack.setAttribute('aria-valuenow', percentage);

        answeredInfo.textContent = `${answeredCount} de ${total} respuestas seleccionadas`;
    }

    // Navegación Siguiente / Anterior
    nextButton.addEventListener('click', () => {
        if (currentQuestionIndex < currentExamData.preguntas.length - 1) {
            currentQuestionIndex++;
            renderQuestion();
        }
    });

    prevButton.addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            renderQuestion();
        }
    });

    // Finalizar examen y corregir
    finishButton.addEventListener('click', () => {
        evaluateExam();
    });

    function evaluateExam() {
        let correctCount = 0;
        let incorrectCount = 0;
        let unansweredCount = 0;

        currentExamData.preguntas.forEach((q, index) => {
            const userAnswer = userAnswers[index];
            if (userAnswer === undefined) {
                unansweredCount++;
            } else {
                const correctOption = q.opciones.find(opt => opt.correcta);
                if (correctOption && correctOption.id === userAnswer) {
                    correctCount++;
                } else {
                    incorrectCount++;
                }
            }
        });

        const total = currentExamData.preguntas.length;
        const score = Math.round((correctCount / total) * 100);

        // Mostrar resultados en el panel
        scorePercentage.textContent = `${score}%`;
        correctAnswersEl.textContent = correctCount;
        incorrectAnswersEl.textContent = incorrectCount;
        unansweredAnswersEl.textContent = unansweredCount;

        if (score >= 50) {
            resultMessage.textContent = '¡Excelente trabajo! Has superado el examen con éxito.';
        } else {
            resultMessage.textContent = 'Puedes repasar los conceptos e intentarlo de nuevo para mejorar tu nota.';
        }

        examPanel.hidden = true;
        resultPanel.hidden = false;
    }

    // Botón de revisar respuestas
    reviewButton.addEventListener('click', () => {
        isReviewMode = true;
        currentQuestionIndex = 0;
        resultPanel.hidden = true;
        examPanel.hidden = false;
        finishButton.hidden = true;
        nextButton.hidden = false;
        renderQuestion();
    });

    // Botón de repetir / reiniciar examen
    restartButton.addEventListener('click', () => {
        currentExamData = null;
        currentQuestionIndex = 0;
        userAnswers = {};
        isReviewMode = false;

        resultPanel.hidden = true;
        examPanel.hidden = true;
        document.querySelector('.exam-selector').hidden = false;
        testSelector.value = '';
    });

    // Funciones auxiliares de UI
    function showLoading(show) {
        if (loadingMessage) loadingMessage.hidden = !show;
    }

    function showError(message) {
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.hidden = false;
        }
    }

    function hideError() {
        if (errorMessage) {
            errorMessage.hidden = true;
            errorMessage.textContent = '';
        }
    }
});