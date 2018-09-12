import * as React from 'react';

export interface IManagedForm {
    isDirty: () => boolean;
    getErrors: (touchedOnly?: boolean) => { [name: string]: string };
    getValues: () => { [name: string]: string };
    revalidate: () => void;
}

export interface IField {
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

interface IState {
    values: any,
    errors: any,
    touched: any // 'modified' if there's any change of value,  'touched' when the 'modified' input loses focus 
}

interface Props {
    model?: { [name: string]: IField };
    defaultValues?: { [name: string]: string };
    className?: string;
    onSubmit?: (values: { [name: string]: string }, dirty: boolean) => void;
    onChange?: (form: IManagedForm, name?: string) => void;
}

export class ManagedForm extends React.Component<Props, IState> {
    state: IState = {
        values: this.props.defaultValues || {}, errors: null, touched: {}
    };

    componentWillMount() {
        const { defaultValues, model } = this.props;
        if (defaultValues && model) {
            for (var name in defaultValues) { // mark all fields that have defaultValue as touched. so that any error will be shown right away
                if (defaultValues[name] && model[name]) this.state.touched[name] = true;
            }
        }

        var errors = this.validate(defaultValues || {}); // initialize errors
        if (errors) this.state.errors = errors;
        if (this.props.onChange) this.props.onChange(this, null); // first call, no matter what (allows the higher component obtain a reference to ManagedForm)
    }

    isDirty = () => {
        return !Object.keys(this.state.values).every(key => !this.props.defaultValues || this.state.values[key] === this.props.defaultValues[key]);
    }
    getErrors = (touchedOnly?: boolean) => {
        if (this.state.errors && touchedOnly) {
            var errs: any = {};
            var hasTouchedErr = false;
            Object.keys(this.state.touched).forEach(key => {
                if (this.state.touched[key] === 'touched' && this.state.errors[key]) {
                    errs[key] = this.state.errors[key];
                    hasTouchedErr = true;
                }
            });
            return hasTouchedErr ? errs : null;
        }
        return this.state.errors;
    }
    getValues = () => { return this.state.values; }
    revalidate = () => {
        var errors = this.validate(this.state.values);
        this.setState({ errors },
            this.props.onChange ? () => this.props.onChange(this, name) : null
        );
    }

    validate = (values: any) => {
        const { model } = this.props;
        if (!model) return null;

        const errors: any = {};
        for (var name in model) {
            var field = model[name] as IField;

            var rules = field.rules;
            if (!rules) continue;

            var val = values[name];
            var err = null;
            if (rules.required && !val) { err = rules['data-msg-required'] || 'Required.'; }
            else if (rules.pattern && val && !(new RegExp(rules.pattern)).test(val)) { err = rules['data-msg-pattern'] || `Input is not valid.`; }
            else if (rules.minLength && val && val.length < rules.minLength) { err = `Must be at least ${rules.minLength} characters.`; }

            if (err) errors[name] = err;
        }
        return Object.keys(errors).length > 0 ? errors : null;
    }

    onChange = (evt: any) => {
        var name = evt.target.name || evt.target.id; // note: some ui component libraries like react-md uses id instead of name 
        //var touched = this.state.touched;
        var values;
        var val = '';
        if (evt.target.type === 'checkbox') val = evt.target.checked ? evt.target.value || 'true' : null;
        else val = evt.target.value;
        values = { ...this.state.values, [name]: val };
        if (!val) delete values[name];

        var errors = this.validate(values);
        var touched = { [name]: 'modified', ...this.state.touched };
        this.setState({ values, errors, touched },
            this.props.onChange ? () => this.props.onChange(this, null) : null
        );
    }

    onBlur = (evt: any) => {
        var name = evt.target.name || evt.target.id; // note: some ui component libraries like react-md uses id instead of name
        if ((!evt.target.tagName || this.state.touched[name]) && this.state.touched[name] !== 'touched') { // no tagName if it's wrapping some other ui component like react-md SelectField
            var touched = { ...this.state.touched, [name]: 'touched' };
            this.setState({ touched },
                this.props.onChange ? () => this.props.onChange(this, null) : null); // onChanged is invoked also when touched changes (touched errors only show up when touched changes)
        }
    }

    onSubmit = (evt: any) => {
        (evt as MouseEvent).preventDefault();
        if (this.props.onSubmit) this.props.onSubmit(this.state.values, this.isDirty());
    }

    manage = (children: React.ReactNode): React.ReactNode => {
        var cloned = false;
        var clones = React.Children.map(children, (child: any) => {
            if (!child || !child.props) return child;

            var props: any;
            var name = child.props.name;
            if (name) {
                cloned = true;
                var value = this.state.values[name] || '';
                var error = this.state.touched[name] === 'touched' && this.state.errors ? this.state.errors[name] : null;
                var attrs: any = null;
                if (this.props.model) {
                    var field = this.props.model[name] as IField;
                    if (field) {
                        attrs = field.attrs ? { ...field.attrs } : {};

                        var rules = field.rules;
                        if (rules) { // other rules let validate method handles
                            if (rules.maxLength) attrs.maxLength = rules.maxLength;
                            if (rules.required) attrs.required = true;
                        }
                    }
                }

                props = {
                    ...attrs,
                    onChange: this.onChange,
                    onBlur: this.onBlur,
                    //                    value,
                    error
                }
                if (child.type === 'input') {
                    switch (child.props.type) {
                        case 'checkbox':
                            if (value) props.checked = true;
                            break;
                        case 'radio':
                            props.checked = (child.props.value === value);
                            break;
                        default:
                            props.value = value;
                            break;
                    }
                } else props.value = value;
            } else if (child.props.type === 'submit') { // treat as submit button to pass 'disabled' attribute
                cloned = true;
                var disabled = this.state.errors !== null || child.props.disabled; // submit button becomes disabled if there are errors.
                props = { disabled };
            } else if (child.props.children) {
                var c2 = this.manage(child.props.children);
                if (c2 !== child.props.children) { // exact same reference to same object if equal (i.e. no clone)
                    cloned = true;
                    props = { children: c2 };
                } else return child;
            } else return child; // don't need clone

            var clone = React.cloneElement(child, props);
            return clone;
        });
        return cloned ? clones : children;
    }

    render() {
        return (
            <form className={this.props.className} onSubmit={this.onSubmit}>
                {this.manage(this.props.children)}
            </ form>);
    }
}