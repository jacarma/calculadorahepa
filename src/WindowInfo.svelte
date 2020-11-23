<script>
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
</script>

<div class=" bg-white z-10 relative">

  <div
    class="modal-close cursor-pointer z-50 absolute top-0 right-0"
    on:click={() => dispatch('close')}>
    <svg
      class="fill-current text-black w-8 h-8"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 18 18">
      <path
        d="M14.53 4.53l-1.06-1.06L9 7.94 4.53 3.47 3.47 4.53 7.94 9l-4.47 4.47
        1.06 1.06L9 10.06l4.47 4.47 1.06-1.06L10.06 9z" />
    </svg>
  </div>
  <h1 class="text-xl">Ventilación</h1>
  <div class="body text-700">
    <p class="mt-2 md:mt-6">
      Mediremos la ventilación existente como la cantidad de veces que el aire
      del interior se renueva completamente en una hora (ACH, del inglés air
      changes per hour).
    </p>

    <p
      class="mt-2 md:mt-6 text-sm rounded bg-yellow-200 p-3 -mx-3 md:p-5
      md:-mx-5 text-yellow-900">
      La representación de la ventilación en la imagen de la calculadora es solo
      ilustrativa y no debe utilizarse para estimar la tasa de ventilación de un
      aula o sala existente. Cuando no se pueda medir, lo más seguro es estimar
      una ventilación de 0.5 ACH.
    </p>

    <p class="mt-2 md:mt-6">
      Puedes aprender cómo medirla correctamente en la
      <a
        href="https://schools.forhealth.org/ventilation-guide/"
        class="text-blue-600 underline">
        Guía en 5 pasos para medir la tasa de renovación de aire en aulas
      </a>
      de Harvard T.H. Chan School of Public Health.
    </p>

    <p class="mt-2 md:mt-6">
      Aunque la tasa esperada de renovación de aire en las aulas en los colegios
      españoles debería ser 3 ACH la tasa más habitual ronda 1.5 ACH pero puede
      ser peor, especialmente si las ventanas se cierran.
    </p>

    <p class="mt-2 md:mt-6">
      No es habitual tener una tasa de más de 3 ACH en un colegio, pero puede
      conseguirse si la ventilación se ha mejorado con algún sistema adicional.
    </p>

  </div>
</div>
