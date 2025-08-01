<template>
  <el-form
    ref="ruleFormRef"
    style="max-width: 600px"
    :model="ruleForm"
    :rules="rules"
    label-width="auto"
  >
    <el-form-item label="原" prop="source">
      <el-radio-group v-model="ruleForm.source">
        <el-radio value="hex">16进制</el-radio>
        <el-radio value="dec">10进制</el-radio>
        <el-radio value="bin">2进制</el-radio>
      </el-radio-group>
    </el-form-item>
    <el-form-item label="转换" prop="target">
      <el-radio-group v-model="ruleForm.target">
        <el-radio value="hex">16进制</el-radio>
        <el-radio value="dec">10进制</el-radio>
        <el-radio value="bin">2进制</el-radio>
      </el-radio-group>
    </el-form-item>
    <el-form-item label="对其方式" prop="endian">
      <el-radio-group v-model="ruleForm.endian">
        <el-radio value="big">大端对其</el-radio>
        <el-radio value="little">小端对齐</el-radio>
      </el-radio-group>
    </el-form-item>
    <el-form-item label="数据" prop="data">
      <el-input v-model="ruleForm.data" type="textarea" />
    </el-form-item>
    <el-form-item>
      <el-button type="primary" @click="submitForm(ruleFormRef)"> 提交 </el-button>
      <el-button @click="resetForm(ruleFormRef)">重置</el-button>
    </el-form-item>
  </el-form>
</template>

<script lang="ts" setup>
import { reactive, ref } from 'vue'

import type { FormInstance, FormRules } from 'element-plus'
import { convertBase } from '@/utils/convert'
import { DataFormat } from '@/utils/dataformat'

interface RuleForm {
  source: 'hex' | 'dec' | 'bin'
  target: 'hex' | 'dec' | 'bin'
  endian: 'big' | 'little'
  data: string
}

const ruleFormRef = ref<FormInstance>()
const ruleForm = reactive<RuleForm>({
  source: 'hex',
  target: 'hex',
  endian: 'big',
  data: '',
})

const rules = reactive<FormRules<RuleForm>>({
  source: [
    {
      required: true,
      message: '选择原进制',
      trigger: 'change',
    },
  ],
  target: [
    {
      required: true,
      message: '选择目标进制',
      trigger: 'change',
    },
  ],
  data: [{ required: true, message: '输入数据', trigger: 'blur' }],
})

const submitForm = async (formEl: FormInstance | undefined) => {
  if (!formEl) return
  await formEl.validate((valid, fields) => {
    if (valid) {
      console.log('submit!')
      console.log(
        convertBase(ruleForm.data, ruleForm.source, ruleForm.target, {
          endian: ruleForm.endian,
        }),
      )
    } else {
      console.log('error submit!', fields)
    }
  })
}

const resetForm = (formEl: FormInstance | undefined) => {
  if (!formEl) return
  formEl.resetFields()
}
</script>
