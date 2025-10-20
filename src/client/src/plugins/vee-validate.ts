import { configure } from 'vee-validate'
import { setLocale } from 'yup'

export const setupValidation = () => {
  configure({
    validateOnBlur: true,
    validateOnChange: true,
    validateOnInput: false,
    validateOnModelUpdate: true,
  })

  setLocale({
    mixed: {
      required: 'To pole jest wymagane.',
    },
    string: {
      email: 'Podaj poprawny adres e-mail.',
      min: 'To pole musi mieć co najmniej ${min} znaków.',
    },
  })
}
