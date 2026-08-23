# Yacht Performance Model Specification

## Physical Basis
- **Type**: 3-DOF Steady-State Equilibrium Solver.
- **Reference Yacht**: Beneteau First 36.7 (LOA: 10.6m, Disp: 5.9t).
- **Resistance**: Viscous + Wave-making drag calibrated to hull speed (~8.5kts).
## Equations
- **Apparent Wind**: $\vec{V}_{aw} = \vec{V}_{tw} - \vec{V}_{bw}$
- **Efficiency**: Sail drive scales via a Gaussian bell curve centered at trim=0.5.
- **Transitions**: First-order lag filters for STW, Heel, and Leeway.
