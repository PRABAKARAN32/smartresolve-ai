# AI Evaluation: Department Classifier

All data is **synthetic** (fictional complaints written for this demo). Evaluation uses a held-out test split that the model never saw during training.

- Model: multinomial Naive Bayes over TF-IDF weighted word counts (`nb-61362fe3`)
- Training examples: 60 | Held-out test examples: 30
- Overall accuracy on the held-out set: **60.0%** (18/30)
- Test cases that would go to manual review: 10/30
- Review rules (tunable, not calibrated): confidence < 0.65, top-2 margin < 0.15, or fewer than 3 recognised words

A small synthetic dataset cannot support a real-world reliability claim.

## Per-class precision and recall

| Department | Precision | Recall | F1 | Test cases |
|---|---|---|---|---|
| Administration | 83.3% | 50.0% | 62.5% | 10 |
| Facilities | 100.0% | 60.0% | 75.0% | 10 |
| IT Support | 77.8% | 70.0% | 73.7% | 10 |

## Confusion matrix (rows = actual, columns = predicted)

| Actual \ Predicted | Administration | Facilities | IT Support | (none) |
|---|---|---|---|---|
| Administration | 5 | 0 | 1 | 4 |
| Facilities | 0 | 6 | 1 | 3 |
| IT Support | 1 | 0 | 7 | 2 |

## Misclassified test cases

- "I forgot my ERP password and the reset link never arrives": actual **IT Support**, predicted **(none)** (confidence 0.0%)
- "Our department shared drive is full and files cannot be saved": actual **IT Support**, predicted **(none)** (confidence 0.0%)
- "Browser shows a certificate warning on the attendance website": actual **IT Support**, predicted **Administration** (confidence 100.0%)
- "Toilet flush is not working on the third floor": actual **Facilities**, predicted **(none)** (confidence 0.0%)
- "Classroom chairs are damaged and some are missing": actual **Facilities**, predicted **IT Support** (confidence 62.2%)
- "The water purifier in the library needs its filter changed": actual **Facilities**, predicted **(none)** (confidence 0.0%)
- "Lamp post at the main gate has fallen after the storm": actual **Facilities**, predicted **(none)** (confidence 0.0%)
- "Please provide a letter confirming that I studied here for the loan application": actual **Administration**, predicted **(none)** (confidence 0.0%)
- "Exam room allocation list has not been displayed on the notice board": actual **Administration**, predicted **IT Support** (confidence 99.3%)
- "Request to update my phone number and address in student records": actual **Administration**, predicted **(none)** (confidence 0.0%)
- "Request a venue booking letter for the annual symposium": actual **Administration**, predicted **(none)** (confidence 0.0%)
- "Please correct the roll number in the semester results": actual **Administration**, predicted **(none)** (confidence 0.0%)

## Train/test leakage check

No test case has a token-overlap (Jaccard) above 0.6 with any training case.
