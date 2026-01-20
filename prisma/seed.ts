import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TENANT_ID = 'demo-tenant';

async function main() {
  console.log('Seeding database...');

  // Create demo users
  const users = await Promise.all([
    prisma.identityUser.upsert({
      where: { tenantId_email: { tenantId: TENANT_ID, email: 'admin@leaderx.com' } },
      update: {},
      create: {
        tenantId: TENANT_ID,
        email: 'admin@leaderx.com',
        fullName: 'Administrador Sistema',
        status: 'ACTIVE',
      },
    }),
    prisma.identityUser.upsert({
      where: { tenantId_email: { tenantId: TENANT_ID, email: 'joao.silva@empresa.com' } },
      update: {},
      create: {
        tenantId: TENANT_ID,
        email: 'joao.silva@empresa.com',
        fullName: 'João Silva',
        status: 'ACTIVE',
      },
    }),
    prisma.identityUser.upsert({
      where: { tenantId_email: { tenantId: TENANT_ID, email: 'maria.santos@empresa.com' } },
      update: {},
      create: {
        tenantId: TENANT_ID,
        email: 'maria.santos@empresa.com',
        fullName: 'Maria Santos',
        status: 'ACTIVE',
      },
    }),
    prisma.identityUser.upsert({
      where: { tenantId_email: { tenantId: TENANT_ID, email: 'pedro.oliveira@empresa.com' } },
      update: {},
      create: {
        tenantId: TENANT_ID,
        email: 'pedro.oliveira@empresa.com',
        fullName: 'Pedro Oliveira',
        status: 'SUSPENDED',
      },
    }),
    prisma.identityUser.upsert({
      where: { tenantId_email: { tenantId: TENANT_ID, email: 'ana.costa@empresa.com' } },
      update: {},
      create: {
        tenantId: TENANT_ID,
        email: 'ana.costa@empresa.com',
        fullName: 'Ana Costa',
        status: 'INACTIVE',
      },
    }),
  ]);

  console.log(`Created ${users.length} users`);

  // Create demo permissions
  const permissions = await Promise.all([
    prisma.permission.upsert({
      where: { tenantId_code: { tenantId: TENANT_ID, code: 'USERS.CREATE' } },
      update: {},
      create: {
        tenantId: TENANT_ID,
        code: 'USERS.CREATE',
        name: 'Criar Usuários',
        category: 'Users',
      },
    }),
    prisma.permission.upsert({
      where: { tenantId_code: { tenantId: TENANT_ID, code: 'USERS.READ' } },
      update: {},
      create: {
        tenantId: TENANT_ID,
        code: 'USERS.READ',
        name: 'Visualizar Usuários',
        category: 'Users',
      },
    }),
    prisma.permission.upsert({
      where: { tenantId_code: { tenantId: TENANT_ID, code: 'USERS.UPDATE' } },
      update: {},
      create: {
        tenantId: TENANT_ID,
        code: 'USERS.UPDATE',
        name: 'Atualizar Usuários',
        category: 'Users',
      },
    }),
    prisma.permission.upsert({
      where: { tenantId_code: { tenantId: TENANT_ID, code: 'USERS.DELETE' } },
      update: {},
      create: {
        tenantId: TENANT_ID,
        code: 'USERS.DELETE',
        name: 'Excluir Usuários',
        category: 'Users',
      },
    }),
    prisma.permission.upsert({
      where: { tenantId_code: { tenantId: TENANT_ID, code: 'ROLES.CREATE' } },
      update: {},
      create: {
        tenantId: TENANT_ID,
        code: 'ROLES.CREATE',
        name: 'Criar Funções',
        category: 'Roles',
      },
    }),
    prisma.permission.upsert({
      where: { tenantId_code: { tenantId: TENANT_ID, code: 'ROLES.READ' } },
      update: {},
      create: {
        tenantId: TENANT_ID,
        code: 'ROLES.READ',
        name: 'Visualizar Funções',
        category: 'Roles',
      },
    }),
    prisma.permission.upsert({
      where: { tenantId_code: { tenantId: TENANT_ID, code: 'ROLES.UPDATE' } },
      update: {},
      create: {
        tenantId: TENANT_ID,
        code: 'ROLES.UPDATE',
        name: 'Atualizar Funções',
        category: 'Roles',
      },
    }),
    prisma.permission.upsert({
      where: { tenantId_code: { tenantId: TENANT_ID, code: 'ROLES.DELETE' } },
      update: {},
      create: {
        tenantId: TENANT_ID,
        code: 'ROLES.DELETE',
        name: 'Excluir Funções',
        category: 'Roles',
      },
    }),
  ]);

  console.log(`Created ${permissions.length} permissions`);

  // Create demo roles
  const adminRole = await prisma.role.upsert({
    where: { tenantId_code: { tenantId: TENANT_ID, code: 'ADMIN' } },
    update: {},
    create: {
      tenantId: TENANT_ID,
      code: 'ADMIN',
      name: 'Administrador',
      description: 'Acesso total ao sistema',
      effect: 'ALLOW',
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { tenantId_code: { tenantId: TENANT_ID, code: 'MANAGER' } },
    update: {},
    create: {
      tenantId: TENANT_ID,
      code: 'MANAGER',
      name: 'Gerente',
      description: 'Gerencia usuários e equipes',
      effect: 'ALLOW',
    },
  });

  const viewerRole = await prisma.role.upsert({
    where: { tenantId_code: { tenantId: TENANT_ID, code: 'VIEWER' } },
    update: {},
    create: {
      tenantId: TENANT_ID,
      code: 'VIEWER',
      name: 'Visualizador',
      description: 'Apenas visualização',
      effect: 'ALLOW',
    },
  });

  console.log('Created 3 roles');

  // Assign admin role to first user
  await prisma.accessAssignment.upsert({
    where: {
      tenantId_userId_roleId_scopeType_scopeId_status: {
        tenantId: TENANT_ID,
        userId: users[0].id,
        roleId: adminRole.id,
        scopeType: 'GLOBAL',
        scopeId: '',
        status: 'ACTIVE',
      },
    },
    update: {},
    create: {
      tenantId: TENANT_ID,
      userId: users[0].id,
      roleId: adminRole.id,
      scopeType: 'GLOBAL',
      scopeId: '',
      status: 'ACTIVE',
    },
  });

  console.log('Assigned ADMIN role to admin user');

  // Create market segments
  const segmentsData = [
    { code: 'VAREJO_ECOMMERCE', name: 'Varejo e E-commerce', description: 'Comércio físico e online, marketplaces' },
    { code: 'ALIMENTOS_BEBIDAS', name: 'Alimentos e Bebidas', description: 'Produção, distribuição e serviços de alimentação' },
    { code: 'TURISMO_HOSPITALIDADE', name: 'Turismo e Hospitalidade', description: 'Hotéis, agências de viagem e turismo' },
    { code: 'SAUDE_FARMACEUTICA', name: 'Saúde e Farmacêutica', description: 'Hospitais, clínicas, laboratórios e indústria farmacêutica' },
    { code: 'ENERGIA_UTILITIES', name: 'Energia e Utilities', description: 'Geração, distribuição de energia e serviços públicos' },
    { code: 'AGRONEGOCIO', name: 'Agronegócio', description: 'Agricultura, pecuária e agroindústria' },
    { code: 'CONSTRUCAO_CIVIL', name: 'Construção Civil', description: 'Construtoras, incorporadoras e engenharia civil' },
    { code: 'IMOBILIARIO', name: 'Imobiliário', description: 'Imobiliárias, administração de imóveis e real estate' },
    { code: 'MANUFATURA_INDUSTRIA', name: 'Manufatura e Indústria', description: 'Produção industrial, bens de consumo e capital' },
    { code: 'PETROLEO_GAS', name: 'Petróleo e Gás', description: 'Exploração, refino e distribuição' },
    { code: 'MARKETING_PUBLICIDADE', name: 'Marketing e Publicidade', description: 'Agências, marketing digital e comunicação' },
    { code: 'TELECOMUNICACOES', name: 'Telecomunicações', description: 'Operadoras, internet, telefonia e comunicações' },
    { code: 'EDUCACAO', name: 'Educação', description: 'Instituições de ensino, treinamento e capacitação' },
    { code: 'FINANCEIRO_BANCARIO', name: 'Financeiro e Bancário', description: 'Bancos, seguradoras, corretoras e fintechs' },
    { code: 'CONSULTORIA_SERVICOS', name: 'Consultoria e Serviços', description: 'Consultorias estratégicas, RH e serviços profissionais' },
    { code: 'AUTOMOTIVO', name: 'Automotivo', description: 'Fabricação e venda de veículos e peças' },
    { code: 'ENTRETENIMENTO_MIDIA', name: 'Entretenimento e Mídia', description: 'Produção de conteúdo, streaming e entretenimento' },
    { code: 'TRANSPORTE_LOGISTICA', name: 'Transporte e Logística', description: 'Transporte de cargas, passageiros e logística' },
    { code: 'TECNOLOGIA_INFORMACAO', name: 'Tecnologia da Informação', description: 'Empresas de software, hardware, TI e serviços digitais' },
    { code: 'JURIDICO', name: 'Jurídico', description: 'Escritórios de advocacia e serviços jurídicos' },
    { code: 'SEGUROS', name: 'Seguros', description: 'Seguradoras, corretoras de seguros e produtos de proteção' },
    { code: 'RECURSOS_HUMANOS', name: 'Recursos Humanos', description: 'RH, recrutamento, seleção, gestão de pessoas e benefícios' },
    { code: 'SAUDE_MEDICINA', name: 'Saúde e Medicina', description: 'Hospitais, clínicas, laboratórios, farmacêuticas e serviços de saúde' },
  ];

  const segments = await Promise.all(
    segmentsData.map((segment, index) =>
      prisma.segment.upsert({
        where: { tenantId_code: { tenantId: TENANT_ID, code: segment.code } },
        update: {},
        create: {
          tenantId: TENANT_ID,
          code: segment.code,
          name: segment.name,
          description: segment.description,
          sortOrder: index + 1,
          status: 'ACTIVE',
        },
      })
    )
  );

  console.log(`Created ${segments.length} market segments`);

  // Create hierarchy groups
  const hierarchyGroupsData = [
    { code: 'C_LEVEL', name: 'C-Level Executivo', level: 1 },
    { code: 'C_SUITE', name: 'C-Suite Officers', level: 2 },
    { code: 'VICE_PRESIDENCIA', name: 'Vice-Presidência', level: 3 },
    { code: 'DIRETORIA', name: 'Diretoria', level: 4 },
    { code: 'GERENCIA', name: 'Gerência', level: 5 },
    { code: 'COORDENACAO', name: 'Coordenação', level: 6 },
    { code: 'SUPERVISAO', name: 'Supervisão', level: 7 },
    { code: 'OPERACIONAL', name: 'Operacional', level: 8 },
  ];

  const hierarchyGroups = await Promise.all(
    hierarchyGroupsData.map((group, index) =>
      prisma.hierarchyGroup.upsert({
        where: { tenantId_code: { tenantId: TENANT_ID, code: group.code } },
        update: {},
        create: {
          tenantId: TENANT_ID,
          code: group.code,
          name: group.name,
          level: group.level,
          sortOrder: index + 1,
          status: 'ACTIVE',
        },
      })
    )
  );

  console.log(`Created ${hierarchyGroups.length} hierarchy groups`);

  // Create positions (cargos)
  const positionsData = [
    // C-Level Executivo
    { code: 'CEO', name: 'CEO (Chief Executive Officer)', hierarchyGroup: 'C_LEVEL', level: 1, canApprove: true },
    { code: 'COUNTRY_DIRECTOR', name: 'Country Director', hierarchyGroup: 'C_LEVEL', level: 1, canApprove: true },
    { code: 'COUNTRY_PRESIDENT', name: 'Country President', hierarchyGroup: 'C_LEVEL', level: 1, canApprove: true },
    { code: 'EMPRESARIO', name: 'Empresário', hierarchyGroup: 'C_LEVEL', level: 1, canApprove: true },
    { code: 'GENERAL_DIRECTOR', name: 'General Director', hierarchyGroup: 'C_LEVEL', level: 1, canApprove: true },
    { code: 'MANAGING_DIRECTOR', name: 'Managing Director', hierarchyGroup: 'C_LEVEL', level: 1, canApprove: true },
    { code: 'PRESIDENTE', name: 'Presidente', hierarchyGroup: 'C_LEVEL', level: 1, canApprove: true },
    { code: 'SOCIO_FUNDADOR', name: 'Sócio Fundador', hierarchyGroup: 'C_LEVEL', level: 1, canApprove: true },

    // C-Suite Officers
    { code: 'CCO', name: 'CCO (Chief Commercial Officer)', hierarchyGroup: 'C_SUITE', level: 2, canApprove: true },
    { code: 'CDO', name: 'CDO (Chief Data Officer)', hierarchyGroup: 'C_SUITE', level: 2, canApprove: true },
    { code: 'CFO', name: 'CFO (Chief Financial Officer)', hierarchyGroup: 'C_SUITE', level: 2, canApprove: true },
    { code: 'CHRO', name: 'CHRO (Chief Human Resources Officer)', hierarchyGroup: 'C_SUITE', level: 2, canApprove: true },
    { code: 'CIO', name: 'CIO (Chief Information Officer)', hierarchyGroup: 'C_SUITE', level: 2, canApprove: true },
    { code: 'CISO', name: 'CISO (Chief Information Security Officer)', hierarchyGroup: 'C_SUITE', level: 2, canApprove: true },
    { code: 'CLO', name: 'CLO (Chief Legal Officer)', hierarchyGroup: 'C_SUITE', level: 2, canApprove: true },
    { code: 'CMO', name: 'CMO (Chief Marketing Officer)', hierarchyGroup: 'C_SUITE', level: 2, canApprove: true },
    { code: 'COO', name: 'COO (Chief Operating Officer)', hierarchyGroup: 'C_SUITE', level: 2, canApprove: true },
    { code: 'CPO', name: 'CPO (Chief Product Officer)', hierarchyGroup: 'C_SUITE', level: 2, canApprove: true },
    { code: 'CRO', name: 'CRO (Chief Revenue Officer)', hierarchyGroup: 'C_SUITE', level: 2, canApprove: true },
    { code: 'CSO', name: 'CSO (Chief Strategy Officer)', hierarchyGroup: 'C_SUITE', level: 2, canApprove: true },
    { code: 'CTO', name: 'CTO (Chief Technology Officer)', hierarchyGroup: 'C_SUITE', level: 2, canApprove: true },
    { code: 'CVO', name: 'CVO (Chief Visionary Officer)', hierarchyGroup: 'C_SUITE', level: 2, canApprove: true },

    // Vice-Presidência
    { code: 'VP_COMERCIAL', name: 'Vice-Presidente Comercial', hierarchyGroup: 'VICE_PRESIDENCIA', level: 3, canApprove: true },
    { code: 'VP_MARKETING', name: 'Vice-Presidente de Marketing', hierarchyGroup: 'VICE_PRESIDENCIA', level: 3, canApprove: true },
    { code: 'VP_OPERACOES', name: 'Vice-Presidente de Operações', hierarchyGroup: 'VICE_PRESIDENCIA', level: 3, canApprove: true },
    { code: 'VP_RH', name: 'Vice-Presidente de RH', hierarchyGroup: 'VICE_PRESIDENCIA', level: 3, canApprove: true },
    { code: 'VP_TECNOLOGIA', name: 'Vice-Presidente de Tecnologia', hierarchyGroup: 'VICE_PRESIDENCIA', level: 3, canApprove: true },
    { code: 'VP_EXECUTIVO', name: 'Vice-Presidente Executivo', hierarchyGroup: 'VICE_PRESIDENCIA', level: 3, canApprove: true },
    { code: 'VP_FINANCEIRO', name: 'Vice-Presidente Financeiro', hierarchyGroup: 'VICE_PRESIDENCIA', level: 3, canApprove: true },

    // Diretoria
    { code: 'DIR_COMERCIAL', name: 'Diretor Comercial', hierarchyGroup: 'DIRETORIA', level: 4, canApprove: true },
    { code: 'DIR_INOVACAO', name: 'Diretor de Inovação', hierarchyGroup: 'DIRETORIA', level: 4, canApprove: true },
    { code: 'DIR_MARKETING', name: 'Diretor de Marketing', hierarchyGroup: 'DIRETORIA', level: 4, canApprove: true },
    { code: 'DIR_OPERACOES', name: 'Diretor de Operações', hierarchyGroup: 'DIRETORIA', level: 4, canApprove: true },
    { code: 'DIR_PRODUTOS', name: 'Diretor de Produtos', hierarchyGroup: 'DIRETORIA', level: 4, canApprove: true },
    { code: 'DIR_RH', name: 'Diretor de RH', hierarchyGroup: 'DIRETORIA', level: 4, canApprove: true },
    { code: 'DIR_SUPPLY_CHAIN', name: 'Diretor de Supply Chain', hierarchyGroup: 'DIRETORIA', level: 4, canApprove: true },
    { code: 'DIR_TECNOLOGIA', name: 'Diretor de Tecnologia', hierarchyGroup: 'DIRETORIA', level: 4, canApprove: true },
    { code: 'DIR_VENDAS', name: 'Diretor de Vendas', hierarchyGroup: 'DIRETORIA', level: 4, canApprove: true },
    { code: 'DIR_EXECUTIVO', name: 'Diretor Executivo', hierarchyGroup: 'DIRETORIA', level: 4, canApprove: true },
    { code: 'DIR_FINANCEIRO', name: 'Diretor Financeiro', hierarchyGroup: 'DIRETORIA', level: 4, canApprove: true },
    { code: 'DIR_GERAL', name: 'Diretor Geral', hierarchyGroup: 'DIRETORIA', level: 4, canApprove: true },
    { code: 'DIR_JURIDICO', name: 'Diretor Jurídico', hierarchyGroup: 'DIRETORIA', level: 4, canApprove: true },

    // Gerência
    { code: 'GERENTE', name: 'Gerente', hierarchyGroup: 'GERENCIA', level: 5, canApprove: true },
    { code: 'GER_COMERCIAL', name: 'Gerente Comercial', hierarchyGroup: 'GERENCIA', level: 5, canApprove: true },
    { code: 'GER_MARKETING', name: 'Gerente de Marketing', hierarchyGroup: 'GERENCIA', level: 5, canApprove: true },
    { code: 'GER_OPERACOES', name: 'Gerente de Operações', hierarchyGroup: 'GERENCIA', level: 5, canApprove: true },
    { code: 'GER_PRODUTO', name: 'Gerente de Produto', hierarchyGroup: 'GERENCIA', level: 5, canApprove: true },
    { code: 'GER_PROJETOS', name: 'Gerente de Projetos', hierarchyGroup: 'GERENCIA', level: 5, canApprove: true },
    { code: 'GER_RH', name: 'Gerente de RH', hierarchyGroup: 'GERENCIA', level: 5, canApprove: true },
    { code: 'GER_TI', name: 'Gerente de TI', hierarchyGroup: 'GERENCIA', level: 5, canApprove: true },
    { code: 'GER_VENDAS', name: 'Gerente de Vendas', hierarchyGroup: 'GERENCIA', level: 5, canApprove: true },
    { code: 'GER_FINANCEIRO', name: 'Gerente Financeiro', hierarchyGroup: 'GERENCIA', level: 5, canApprove: true },
    { code: 'GER_GERAL', name: 'Gerente Geral', hierarchyGroup: 'GERENCIA', level: 5, canApprove: true },
    { code: 'GER_SENIOR', name: 'Gerente Sênior', hierarchyGroup: 'GERENCIA', level: 5, canApprove: true },

    // Coordenação
    { code: 'COORDENADOR', name: 'Coordenador', hierarchyGroup: 'COORDENACAO', level: 6, canApprove: true },
    { code: 'COORD_ADMINISTRATIVO', name: 'Coordenador Administrativo', hierarchyGroup: 'COORDENACAO', level: 6, canApprove: true },
    { code: 'COORD_MARKETING', name: 'Coordenador de Marketing', hierarchyGroup: 'COORDENACAO', level: 6, canApprove: true },
    { code: 'COORD_PROJETOS', name: 'Coordenador de Projetos', hierarchyGroup: 'COORDENACAO', level: 6, canApprove: true },
    { code: 'COORD_RH', name: 'Coordenador de RH', hierarchyGroup: 'COORDENACAO', level: 6, canApprove: true },
    { code: 'COORD_TI', name: 'Coordenador de TI', hierarchyGroup: 'COORDENACAO', level: 6, canApprove: true },
    { code: 'COORD_VENDAS', name: 'Coordenador de Vendas', hierarchyGroup: 'COORDENACAO', level: 6, canApprove: true },
    { code: 'COORD_FINANCEIRO', name: 'Coordenador Financeiro', hierarchyGroup: 'COORDENACAO', level: 6, canApprove: true },

    // Supervisão
    { code: 'SUPERVISOR', name: 'Supervisor', hierarchyGroup: 'SUPERVISAO', level: 7, canApprove: false },
    { code: 'SUP_ADMINISTRATIVO', name: 'Supervisor Administrativo', hierarchyGroup: 'SUPERVISAO', level: 7, canApprove: false },
    { code: 'SUP_OPERACOES', name: 'Supervisor de Operações', hierarchyGroup: 'SUPERVISAO', level: 7, canApprove: false },
    { code: 'SUP_PRODUCAO', name: 'Supervisor de Produção', hierarchyGroup: 'SUPERVISAO', level: 7, canApprove: false },
    { code: 'SUP_QUALIDADE', name: 'Supervisor de Qualidade', hierarchyGroup: 'SUPERVISAO', level: 7, canApprove: false },
    { code: 'SUP_VENDAS', name: 'Supervisor de Vendas', hierarchyGroup: 'SUPERVISAO', level: 7, canApprove: false },

    // Operacional
    { code: 'ANALISTA', name: 'Analista', hierarchyGroup: 'OPERACIONAL', level: 8, canApprove: false },
    { code: 'ANALISTA_JR', name: 'Analista Júnior', hierarchyGroup: 'OPERACIONAL', level: 8, canApprove: false },
    { code: 'ANALISTA_PL', name: 'Analista Pleno', hierarchyGroup: 'OPERACIONAL', level: 8, canApprove: false },
    { code: 'ANALISTA_SR', name: 'Analista Sênior', hierarchyGroup: 'OPERACIONAL', level: 8, canApprove: false },
    { code: 'ASSISTENTE', name: 'Assistente', hierarchyGroup: 'OPERACIONAL', level: 8, canApprove: false },
    { code: 'AUXILIAR', name: 'Auxiliar', hierarchyGroup: 'OPERACIONAL', level: 8, canApprove: false },
    { code: 'CONSULTOR', name: 'Consultor', hierarchyGroup: 'OPERACIONAL', level: 8, canApprove: false },
    { code: 'ESPECIALISTA', name: 'Especialista', hierarchyGroup: 'OPERACIONAL', level: 8, canApprove: false },
    { code: 'ESTAGIARIO', name: 'Estagiário', hierarchyGroup: 'OPERACIONAL', level: 8, canApprove: false },
    { code: 'TRAINEE', name: 'Trainee', hierarchyGroup: 'OPERACIONAL', level: 8, canApprove: false },
  ];

  let positionCount = 0;
  for (const position of positionsData) {
    await prisma.position.upsert({
      where: { tenantId_code: { tenantId: TENANT_ID, code: position.code } },
      update: {},
      create: {
        tenantId: TENANT_ID,
        code: position.code,
        name: position.name,
        hierarchyGroup: position.hierarchyGroup,
        level: position.level,
        canApprove: position.canApprove,
        sortOrder: positionCount + 1,
        status: 'ACTIVE',
      },
    });
    positionCount++;
  }

  console.log(`Created ${positionCount} positions`);

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
