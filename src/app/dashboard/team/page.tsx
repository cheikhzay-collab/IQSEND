'use client';

import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  CheckCircle,
  Clock,
  Mail,
  Phone,
  MoreVertical
} from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CONFIRMATION_AGENT' | 'PACKER' | 'TRACKING_AGENT';
  assignedCity: string;
  confirmedCount: number;
  isActive: boolean;
}

const INITIAL_TEAM: TeamMember[] = [
  {
    id: 'u1',
    name: 'Amine Daoudi',
    email: 'amine@sendit-cod.ma',
    role: 'ADMIN',
    assignedCity: 'Toutes les villes',
    confirmedCount: 420,
    isActive: true,
  },
  {
    id: 'u2',
    name: 'Sara Ibrahimi',
    email: 'sara@sendit-cod.ma',
    role: 'CONFIRMATION_AGENT',
    assignedCity: 'Casablanca & Rabat',
    confirmedCount: 312,
    isActive: true,
  },
  {
    id: 'u3',
    name: 'Youssef El Fassi',
    email: 'youssef@sendit-cod.ma',
    role: 'PACKER',
    assignedCity: 'Hub Central Casa',
    confirmedCount: 520,
    isActive: true,
  },
  {
    id: 'u4',
    name: 'Hajar Bennani',
    email: 'hajar@sendit-cod.ma',
    role: 'TRACKING_AGENT',
    assignedCity: 'Marrakech, Fes, Tanger',
    confirmedCount: 198,
    isActive: true,
  },
];

export default function TeamManagementPage() {
  const [members, setMembers] = useState<TeamMember[]>(INITIAL_TEAM);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <span className="bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full font-bold text-[10px]">Administrateur</span>;
      case 'CONFIRMATION_AGENT':
        return <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-bold text-[10px]">Agent Confirmation</span>;
      case 'PACKER':
        return <span className="bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full font-bold text-[10px]">Préparateur (Packer)</span>;
      case 'TRACKING_AGENT':
        return <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold text-[10px]">Agent de Suivi Sendit</span>;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              Gestion de l'Équipe & Contrôle d'Accès (RBAC)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Attribution des rôles, permissions granulaires et répartition des leads par ville
          </p>
        </div>

        <button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors">
          <UserPlus className="w-3.5 h-3.5" /> Ajouter un Collaborateur
        </button>
      </div>

      {/* Team List Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-800">Membres Actifs ({members.length})</h2>
          <span className="text-xs text-slate-400">Règles RBAC appliquées</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-100">
              <tr>
                <th className="p-3.5">Collaborateur</th>
                <th className="p-3.5">Rôle Système</th>
                <th className="p-3.5">Zone Assignée</th>
                <th className="p-3.5">Commandes Traitées</th>
                <th className="p-3.5">Statut</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50/50">
                  <td className="p-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs">
                        {member.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">{member.name}</span>
                        <span className="text-[11px] text-slate-400">{member.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5">{getRoleBadge(member.role)}</td>
                  <td className="p-3.5 font-medium text-slate-600">{member.assignedCity}</td>
                  <td className="p-3.5 font-bold text-slate-800">{member.confirmedCount} colis</td>
                  <td className="p-3.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Actif
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <button className="text-slate-400 hover:text-slate-700 p-1 rounded-md">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
