import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ArchwizardModule } from '@rg-software/angular-archwizard';
import { WizardComponent as BaseWizardComponent } from '@rg-software/angular-archwizard';
import { CircleCheckBigIcon, LucideAngularModule } from 'lucide-angular';

@Component({
    selector: 'app-wizard',
    imports: [
        RouterLink,
        ArchwizardModule,
        ReactiveFormsModule,
        LucideAngularModule
    ],
    templateUrl: './wizard.component.html'
})
export class WizardComponent implements OnInit {

  readonly circleCheckBigIcon = CircleCheckBigIcon;

  validationForm1: UntypedFormGroup;
  validationForm2: UntypedFormGroup;

  isForm1Submitted: Boolean;
  isForm2Submitted: Boolean;

  @ViewChild('wizardForm') wizardForm: BaseWizardComponent;

  private readonly formBuilder = inject(UntypedFormBuilder);

  ngOnInit(): void {
    
    /**
     * form1 value validation
     */
    this.validationForm1 = this.formBuilder.group({
      firstName : ['', Validators.required],
      lastName : ['', Validators.required],
      userName : ['', Validators.required]
    });

    /**
     * formw value validation
     */
    this.validationForm2 = this.formBuilder.group({
      email : ['', [Validators.required, Validators.email]],
      mobileNumber : ['', Validators.required],
      password : ['', Validators.required]
    });

    this.isForm1Submitted = false;
    this.isForm2Submitted = false;

  }


  /**
   * Wizard finish function
   */
  finishFunction() {
    alert('Successfully Completed');
  }

  
  /**
   * Returns form
   */
  get form1(): any {
    return this.validationForm1.controls;
  }


  /**
   * Returns form
   */
  get form2(): any {
    return this.validationForm2.controls;
  }


  /**
   * Go to next step while form value is valid
   */
  form1Submit() {
    if(this.validationForm1.valid) {
      this.wizardForm.goToNextStep();
    }
    this.isForm1Submitted = true;
  }


  /**
   * Go to next step while form value is valid
   */
  form2Submit() {
    if(this.validationForm2.valid) {
      this.wizardForm.goToNextStep();
    }
    this.isForm2Submitted = true;
  }

  
}
