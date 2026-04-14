Resolução do Conflito: 
# Qual estratégia você escolheu para lidar com a concorrência de dados e por quê? (Pense em Operational Transformation, CRDTssimplificados ou Optimistic UI com rollback).
- Optimistic UI com rollback é melhor já que atualiza o estado no momento que a alteração é feita
- O rollback garante consistência quando há falha
- O versionamento garante que sempre o dado mais atual é recuperado

# Estratégia de Testes: Por que você testou o que testou? Como garantiu que a lógica de negócio está protegida?
- O foco dos testes foram nas funcionalidades e não na interface

# Arquitetura: Como o Zustand foi estruturado para suportar essa complexidade sem degradar a performance?
- Stores separadas por domínio: Uma store para as ofertas, outra para o estado de UI, outra para o estado de sincronização (pendente, confirmado, erro) e outra para os filtros

- A store guarda três camadas — o dado confirmado pelo servidor, o dado otimista atual (que o usuário vê) e o snapshot de rollback.
Isso facilita a gestão do estado, principalmente em caso de erro.

- O useShallow para garantir que o dado não seja re-renderizado a todo momento

# Trade-offs: O que você priorizou e o que deixou de fora?
- O foco na solução do problema de conflito na gestão de estado, e atualização otimizada, então o projeto tem mais foco em garantir que
o dado renderizado sempre seja consistente, em contrapartida, não houve muito aprofundamento no UI/UX, e validação de cenários dinâmicos,
como uma store com muitas ofertas e produtos trocando de estado (oferta ativa, expirada), ao mesmo tempo que atualiza o estoque.
- A API tem um conflito entre o GET e o PATCH da atualização já que o servidor precisaria validar a versão mais atual antes de seguir com
a solicitação
- As classes CSS não foram renomeadas, e poderiam ter uma nomenclatura melhor