AddCSLuaFile("shared.lua")
include("shared.lua")

DEFINE_BASECLASS(SWEP.Base)

function SWEP:PrimaryAttack()
    -- BaseClass.PrimaryAttack(self)
    if (not IsFirstTimePredicted()) then return end

    local client = self:GetOwner()
    local char = client:GetChar()

    self:SetNextPrimaryFire(CurTime() + .5)

    if (char) then
        client:AddFlashlightCharge(ix.config.Get("chargerRestore"))
    end

    self:SendVMSequence('fire')
end

function SWEP:SendVMSequence(name)
	local vm = self:GetOwner():GetViewModel()
	if (IsValid(vm)) then
		vm:SendViewModelMatchingSequence(vm:LookupSequence(name))
	end
end