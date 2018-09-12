`react-managed-form` is a small footprint React component for form inputs and data validation. All form input values are stored locally using React state.

Check out a simple [DEMO](https://alanocoder.github.io/demos/react-managed-form/) in action. [Demo code](https://github.com/alanocoder/demos/tree/master/react-managed-form) is hosted at github.

# Install:
```
npm install --save react-managed-form
```
# Dependencies:
There is no dependencies other than React and React-dom.
# Usage:
```
onSubmit = (values: {[name: string]: string}, dirty: boolean) => {
   // callback when user clicks submit
}

render() {
   return (
      <ManagedForm onSubmit={this.onSubmit}>
         <input name='name' />
         <input name='email' placeholder='Your email' />
         <button type='submit'>Submit</button>
      </ManagedForm>
   );
}
```
Use ManagedForm like a html form tag. Any element with property name and submit button will be managed. Form data is provided at the onSubmit() callback.

You can pass in initial values to ManagedForm using the property defaultValues. For example, if email address is known, you can pass it as follow:
```
<ManagedForm onSubmit={this.onSubmit} defaultValues={{ email: 'name@example.com'}}>
```
# Validation:
To enable validation, define a model object with validation rules. Then pass it to `ManagedForm`.
```
Model = {
   'name': {
      attrs: { placeholder: 'Your name' },
      rules: { required: true }
   },
   'email': { rules: { required: true } }
};
```
```
<ManagedForm onSubmit={this.onSubmit} model={Model}>
```
The above model defines both fields 'name' and 'email' as required. The submit button would not be enabled until user enters information for both fields. You can also define pass over properties ('attrs') in which ManagedForm will simply pass them to the corresponding managed input. It would be useful if you want to define the object models elsewhere and then import to it. Model object is a mapping of input name to the IField object defined as below:
```
interface IField {
    attrs?: { [key: string]: string };
    rules?: {
        maxLength?: number;
        minLength?: number;
        required?: boolean;
        ['data-msg-required']?: string;
        pattern?: string;
        ['data-msg-pattern']?: string;
    }
}
```
So you can also define minimum length, maximum length, and a regular expression pattern to match the input. data-msg-required & data-msg-pattern are the custom error messages to return when the corresponding rule fails.
# Error handling at field level
Please note that `ManagedForm` does NOT display error messages for you. Rather, when user changes data to a managed input and the validation failed, `ManagedForm` will pass an 'error' property to the managed input to display error at the field level. In the above example, obviously, the html input element does not know how to consume the 'error' property and therefore will be ignored. A simple wrapper (either function or component) would do the trick:
```
const RenderTextField = (props: { name: string, error?: string, [key: string]: any }) => {
    const { name, error, ...rest } = props;
    return (
        <div>
            <input name={name} {...rest} />
            {error && <div>{error}</div>}
        </div>
    );
}
```
```
<RenderTextField name='name' /> instead of <input name='name' />
```
You can use `ManagedForm` together with other UI component libraries like `react-md` and `react-toolbox` or library of your choice. Similarly, a wrapper is most likely needed to connect properties passed by `ManagedForm` to match properties used by those UI components. The sample code will have some wrapper samples for `react-md` to showcase the connection.
[Example demo](https://alanocoder.github.io/demos/react-managed-form-react-md/): `ManagedForm` to work with `react-md`.

# Error handling at form level
You can listen to data changes by passing `onChange` callback to `ManagedForm` as follow:
```
onChange = (form: IManagedForm, name?: string) => {
  // your logic to check for errors and display accordingly
}
```
```
<ManagedForm onSubmit={this.onSubmit} onChange={this.onChange} model={Model}>
```
A form object of type `IManagedForm` is available for you to check values or errors. `IManagedForm` is defined as:
```
interface IManagedForm {
    isDirty: () => boolean;
    getErrors: (touchedOnly?: boolean) => { [name: string] : string };
    getValues: () => { [name: string] : string };
    revalidate: () => void;
}
```
Invoke `getErrors()` to return any validation errors of ALL managed inputs. You can then examine any error (Note: `null` is returned for no errors) and update the component accordingly. When 'touchedOnly' is set to True, `getErrors(true)` only returns errors for `touched` inputs. A managed input only becomes touched when user entered some info and then lost focus (moved on to another input).

That's about it. This component is implemented to keep it small and slim. Just enough to handle data collection and validation. The footprint should be less than 2KB gzipped.